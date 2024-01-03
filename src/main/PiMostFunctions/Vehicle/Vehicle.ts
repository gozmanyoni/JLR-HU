import { FBlock } from '../Common/FBlock'
import { messages } from 'socketmost'
import { EngineSpeed } from './EngineSpeed'
import { ExtTemperature } from './ExtTemperature'

export class Vehicle extends FBlock {
  constructor(
    instanceID: number,
    writeMessage: (message: messages.SocketMostSendMessage) => void,
    sourceAddrHigh: number,
    sourceAddrLow: number,
    addressHigh: number,
    addressLow: number
  ) {
    super(0x05, instanceID, writeMessage, sourceAddrHigh, sourceAddrLow, addressHigh, addressLow)
    this.registerFunction(0x206, EngineSpeed)
    this.registerFunction(0x407, ExtTemperature)
  }
}
