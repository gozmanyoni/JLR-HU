import { MixerLevel } from '../AudioDiskPlayer/MixerLevel'
import { Volume } from '../JlrAudio/Volume'
import { Bass } from './Bass'
import { Treble } from './Treble'
import { Subwoofer } from './Subwoofer'
import { FBlock } from '../Common/FBlock'
import { Disconnect } from '../Common/Disconnect'
import { messages } from 'socketmost'
import { Connect } from '../Common/Connect'

export class Amplifier extends FBlock {
  constructor(
    instanceID: number,
    writeMessage: (message: messages.SocketMostSendMessage) => void,
    sourceAddrHigh: number,
    sourceAddrLow: number,
    addressHigh: number,
    addressLow: number
  ) {
    super(0x22, instanceID, writeMessage, sourceAddrHigh, sourceAddrLow, addressHigh, addressLow)
    this.registerFunction(0x467, MixerLevel)
    this.registerFunction(0x400, Volume)
    this.registerFunction(0x116, Disconnect)
    this.registerFunction(0x111, Connect)
    this.registerFunction(0x202, Bass)
    this.registerFunction(0x203, Treble)
    this.registerFunction(0x402, Subwoofer)
  }

  // sendMessage({fktID, opType, data}) {
  //     this.writeMessage({fBlockID: this.fBlockID, instanceID: this.instID, fktID, opType, data}, {sourceAddrHigh: this.sourceAddrHigh, sourceAddrLow: this.sourceAddrLow})
  // }
}
