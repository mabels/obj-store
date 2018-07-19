import { Msg, PouchConfig, PouchConfigObj, Match, PouchBase } from 'foundation-store';
import { Block, BlockObj } from 'sha-store/dist/src/types/block';
import { ShaContainer } from './sha-container';
import { ReadResContainer } from './read-res-container';

export interface ReadObjResInit {
  readonly tid: string;
  readonly name: string;
  readonly readResContainers: ReadResContainer[];
  readonly error?: Error;
}

export interface ReadObjResObj extends ReadObjResInit {
}

export class ReadObjRes extends Msg implements ReadObjResObj {
  public readonly name: string;
  public readonly readResContainers: ReadResContainer[];
  public readonly error?: Error;

  public static is(msg: any): Match<ReadObjRes> {
    if (msg instanceof ReadObjRes) {
      // console.log(`Match:FeedDone`, msg);
      return Match.create<ReadObjRes>(msg);
    }
    return Match.nothing();
  }

  constructor(fwi: ReadObjResInit) {
    super(fwi.tid);
    this.readResContainers = fwi.readResContainers;
    this.name = fwi.name;
    this.error = fwi.error;
  }

  public isOk(): boolean {
    return !this.error;
  }

  public asObj(): ReadObjResObj {
    return {
      tid: this.tid,
      name: this.name,
      readResContainers: this.readResContainers,
      error: this.error
    };
  }

  public latest(): ReadResContainer {
    return this.readResContainers.sort((a, b) => a.compare(b))[0];
  }

}
