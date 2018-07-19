import { Msg, PouchConfig, Match } from 'foundation-store';
import { Block } from 'sha-store/dist/src/types/block';

export interface WriteObjInit {
  readonly tid?: string;
  readonly config: PouchConfig;
  readonly name: string;
  readonly block: Block;
}

export class WriteObjReq extends Msg implements WriteObjInit {
  public readonly config: PouchConfig;
  public readonly name: string;
  public readonly block: Block;

  public static is(msg: any): Match<WriteObjReq> {
    if (msg instanceof WriteObjReq) {
      // console.log(`Match:FeedDone`, msg);
      return Match.create<WriteObjReq>(msg);
    }
    return Match.nothing();
  }

  constructor(fwi: WriteObjInit) {
    super(fwi.tid);
    this.config = fwi.config;
    this.name = fwi.name;
    this.block = fwi.block;
  }

}
