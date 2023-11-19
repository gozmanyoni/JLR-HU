import { SocketMost, SocketMostClient } from 'socketmost'
import {
  Os8104Events,
  RawMostRxMessage,
  SocketMostSendMessage,
  Stream
} from 'socketmost/dist/modules/Messages'
import { MessageNames, Socket } from './Socket'
import { AudioDiskPlayer } from './PiMostFunctions/AudioDiskPlayer/AudioDiskPlayer'
import { AmFmTuner } from './PiMostFunctions/AmFm/AmFmTuner'
import { fBlocks, opTypes } from './PiMostFunctions/Common/enums'
import { Action, AvailableSources } from "./Globals";
import { u240 } from './PiMostFunctions/JlrAudio/u240'
import { Amplifier } from './PiMostFunctions/Amplifier/Amplifier'



export class PiMost {
  socketMost: SocketMost
  socketMostClient: SocketMostClient
  socket: Socket
  timeoutType: string
  subscriptionTimer: NodeJS.Timeout | null
  interfaces: {
    AudioDiskPlayer?: AudioDiskPlayer
    u240?: u240
    AmFmTuner?: AmFmTuner
    Amplifier?: Amplifier
    secAmplifier?: Amplifier
  }
  stabilityTimeout: null | NodeJS.Timeout
  sourcesInterval: null | NodeJS.Timeout
  currentSource: AvailableSources

  constructor(socket: Socket) {
    console.log('creating client in PiMost')
    this.socketMost = new SocketMost()
    this.socketMostClient = new SocketMostClient()
    this.socket = socket
    this.subscriptionTimer = null
    this.timeoutType = ''
    this.socket.on(MessageNames.Stream, (stream) => {
      this.stream(stream)
    })

    this.interfaces = {}
    this.stabilityTimeout = null
    this.sourcesInterval = null
    this.currentSource = 'AmFmTuner'

    this.socketMostClient.on('connected', () => {
      this.interfaces.AudioDiskPlayer = new AudioDiskPlayer(
        0x02,
        this.sendMessage.bind(this),
        0x01,
        0x80,
        0x01,
        0x10
      )
      this.interfaces.u240 = new u240(0x01, this.sendMessage.bind(this), 0x01, 0x61, 0x01, 0x10)
      this.interfaces.AmFmTuner = new AmFmTuner(
        0x01,
        this.sendMessage.bind(this),
        0x01,
        0x80,
        0x01,
        0x10
      )
      this.interfaces.Amplifier = new Amplifier(
        0xa1,
        this.sendMessage.bind(this),
        0x01,
        0x61,
        0x01,
        0x10
      )
      this.interfaces.secAmplifier = new Amplifier(
        0x05,
        this.sendMessage.bind(this),
        0x01,
        0x86,
        0x01,
        0x10
      )
      // this.interfaces.secAmplifier = new Amplifier(0x20, this.sendMessage.bind(this), 0x01, 0x86, 0x01, 0x10)
      this.interfaces.AudioDiskPlayer.on('statusUpdate', (data) => {
        socket.sendStatusUpdate('audioDiskPlayerUpdate', data)
      })
      this.interfaces.u240.on('statusUpdate', (data) => {
        socket.sendStatusUpdate('volumeUpdate', data)
      })
      this.interfaces.AmFmTuner.on('statusUpdate', (data) => {
        socket.sendStatusUpdate('amFmTunerUpdate', data)
      })
      this.interfaces.Amplifier.on('statusUpdate', (data) => {
        socket.sendStatusUpdate('amplifierUpdate', data)
        console.log(data)
      })

      socket.on('newConnection', () => {
        console.log('SENDING FULL UPDATE')
        socket.sendStatusUpdate('audioDiskPlayerFullUpdate', this.interfaces.AudioDiskPlayer!.state)
        socket.sendStatusUpdate('volumeFullUpdate', this.interfaces.u240!.state)
        socket.sendStatusUpdate('amFmTunerFullUpdate', this.interfaces.AmFmTuner!.state)
        socket.sendStatusUpdate('amplifierFullUpdate', this.interfaces.Amplifier!.state)
      })

      socket.on('action', (message: Action) => {
        console.log('action request', message)
        const { fktId, opType, type, data, method } = message
        const opTypeString = opTypes[method][opType]
        this.interfaces[type].functions[fktId].actionOpType[opTypeString](data)
      })

      socket.on('allocate', (source) => {
        console.log("received allocate")
        this.changeSource(source)
      })

      this.socketMostClient.on(Os8104Events.Locked, () => {
        if (this.stabilityTimeout) clearTimeout(this.stabilityTimeout)
        this.stabilityTimeout = setTimeout(() => {
          console.log('locked, subscribing')
          this.sourcesInterval = setInterval(() => {
            // this.interfaces?.secAmplifier?.functions[0xE09].get([])
          }, 100)
          this.subscribeToAll()
        }, 3000)
      })

      this.socketMostClient.on(Os8104Events.Unlocked, () => {
        console.log('UNLOCKED')
        clearTimeout(this.stabilityTimeout!)
        if (this.sourcesInterval) {
          clearInterval(this.sourcesInterval!)
        }
      })

      this.socketMostClient.on(
        Os8104Events.SocketMostMessageRxEvent,
        (message: RawMostRxMessage) => {
          console.log("message", message)
          const type = fBlocks[message.fBlockID]
          if (message.opType === 15) {
            console.log('most error', message)
          }
          if (type === this.timeoutType) {
            this.subscriptionTimer!.refresh()
          }
          this.interfaces?.[type]?.parseMessage(message)
        }
      )
    })
  }
  stream(stream: Stream) {
    this.socketMostClient.stream(stream)
  }

  sendMessage(message: SocketMostSendMessage) {
    console.log('send message request', message)
    this.socketMostClient.sendControlMessage(message)
  }

  async subscribeToAll() {
    for (const k of Object.keys(this.interfaces)) {
      await this.subscribe(k)
    }
  }

  subscribe(interfaceType: string) {
    // this.socketMostClient.sendControlMessage()
    console.log('subscribing to ', interfaceType)
    this.interfaces[interfaceType]!.allNotifcations()
    return new Promise((resolve, reject) => {
      this.timeoutType = interfaceType
      this.subscriptionTimer = setTimeout(() => {
        console.log('subscription finished')
        this.timeoutType = ''
        resolve(true)
      }, 200)
    })
  }

  async changeSource(newSource: AvailableSources) {
    console.log("new source", newSource)
    await this.interfaces.secAmplifier!.functions[0x112].startResult([0x01])
    console.log("deallocate requesting")
    await this.disconnectSource()
    console.log("waiting for result")
    await this.waitForDealloc(this.currentSource)
    console.log("deallocated")
    console.log("allocating new")
    await this.allocateSource(newSource)
    console.log("allocated new")
    let data = await this.waitForAlloc(newSource)
    console.log("allocated", data)
    console.log("connecting")
    await this.interfaces.secAmplifier!.functions[0x111].startResult([0x01, data.srcDelay, ...data.channelList])
  }

  async disconnectSource() {
    console.log("disconnecting")
    await this.interfaces[this.currentSource]!.functions[0x102].startResult([0x01])
  }

  waitForDealloc(source) {
    return new Promise((resolve, reject) => {
      this.interfaces[source].once('deallocResult', (source) => {
        console.log("resolving deallocResult")
        resolve(true)
      })
    })
  }

  async allocateSource(source) {
    console.log("running allocate")
    await this.interfaces[source].functions[0x101].startResult([0x01])
  }

  waitForAlloc(source) {
    return new Promise((resolve, reject) => {
      this.interfaces[source].once('allocResult', (results) => {
        resolve(results)
      })
    })
  }

}
