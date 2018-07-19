import { Msg, Match, PouchConfig } from 'foundation-store';

export interface ReadObjReqInit {
  readonly tid?: string;
  readonly name: string;
  readonly config: PouchConfig;
}

export class ReadObjReq extends Msg implements ReadObjReqInit {
  public readonly config: PouchConfig;
  public readonly name: string;

  public static is(msg: any): Match<ReadObjReq> {
    if (msg instanceof ReadObjReq) {
      // console.log(`Match:FeedDone`, msg);
      return Match.create<ReadObjReq>(msg);
    }
    return Match.nothing();
  }

  constructor(fwi: ReadObjReqInit) {
    super(fwi.tid);
    this.config = fwi.config;
    this.name = fwi.name;
  }

}
