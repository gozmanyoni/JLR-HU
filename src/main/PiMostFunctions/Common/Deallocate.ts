import { Fkt } from './Function'
import { FktIdPartMessage } from '../../Globals'

export class Deallocate extends Fkt {
  constructor(
    fktId: number,
    writeMessage: (message: FktIdPartMessage) => void,
    updateStatus: (result: Object) => void
  ) {
    super(fktId, writeMessage, updateStatus)
  }

  async status(data, telLen) {
    // let functions = []
    // for(let i=0;i<data.length;i+=3) {
    //     functions.push((data.readUint16BE(i) >> 4))
    //     if((i+1) < data.length-1) {
    //         functions.push((data.readUint16BE(i+1) & 0xFFF))
    //     }
    // }
    // this.updateStatus(functions)
    console.log("deallocate status", data)
    const source = data.readUInt8(0)
    this.emit('deallocResult', source)
    this.responseReceived = true
  }
}
