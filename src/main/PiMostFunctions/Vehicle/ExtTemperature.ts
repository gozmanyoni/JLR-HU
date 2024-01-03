import { Fkt } from '../Common/Function'

export class ExtTemperature extends Fkt {
  async status(data: Buffer) {
    console.log('Ext Temp update', data)
    const value = data.readUInt16BE(0)
    const status = { extTemp: value }
    this.updateStatus(status)
    this.responseReceived = true
  }
}
