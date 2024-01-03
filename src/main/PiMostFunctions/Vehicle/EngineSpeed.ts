import { Fkt } from '../Common/Function'

export class EngineSpeed extends Fkt {
  async status(data: Buffer) {
    console.log('EngineSpeed update', data)
    const value = data.readUInt16BE(0)
    const status = { engineSpeed: value }
    this.updateStatus(status)
    this.responseReceived = true
  }
}
