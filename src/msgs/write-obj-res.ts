
import { Msg, Match } from 'foundation-store';
import { FragmentType } from 'sha-store';
import { ShaContainer } from './sha-container';

export interface WriteObjResObj {
  readonly error?: Error;
  readonly created?: string;
  readonly name: string;
  readonly _id: string;
  readonly tid: string;
  readonly sha: string;
  readonly writeResContainer: ShaContainer;
}

export class WriteObjRes extends Msg implements WriteObjResObj {
  public readonly error?: Error;
  public readonly _id: string;
  public readonly name: string;
  public readonly created: string;
  public readonly sha: string;
  public readonly writeResContainer: ShaContainer;

  public static is(msg: any): Match<WriteObjRes> {
    if (msg instanceof WriteObjRes) {
      // console.log(`Match:FeedDone`, msg);
      return Match.create<WriteObjRes>(msg);
    }
    return Match.nothing();
  }

  constructor(fwso: WriteObjResObj) {
    super(fwso.tid);
    this.error = fwso.error;
    this._id = fwso._id;
    this.name = fwso.name;
    this.created = fwso.created || (new Date()).toISOString();
    this.sha = fwso.sha;
    this.writeResContainer = fwso.writeResContainer;
  }

  public isOk(): boolean {
    return !this.error;
  }

  public asObj(): WriteObjResObj {
    return {
      tid: this.tid,
      _id: this._id,
      name: this.name,
      created: this.created,
      sha: this.sha,
      writeResContainer: this.writeResContainer,
      error: this.error
    };
  }

}
