import * as url from 'url';
import * as crypto from 'crypto';

import * as uuid from 'uuid';
import * as PouchDB from 'pouchdb';

import { WriteObjReq } from './msgs/write-obj-req';
import { ReadObjReq } from './msgs/read-obj-req';
import { ReadObjRes } from './msgs/read-obj-res';
import { WriteObjRes } from './msgs/write-obj-res';
import { PouchConfig, MsgBus, PouchConnectionRes, PouchConnectionReq, Msg } from 'foundation-store';
import { Block, WriteReq, FragmentType, ReadRes, WriteRes } from 'sha-store';
import { ShaContainer } from './msgs/sha-container';
import { ReadResContainer } from './msgs/read-res-container';

interface ObjPouchInit {
  readonly _id?: string;
  readonly created?: string;
  readonly name: string;
  readonly sha: string;
  readonly writeResContainer: ShaContainer; // mimestring
}

class ObjPouchDocV1 implements ObjPouchInit {
  public readonly _id: string;
  public readonly type: string;
  public readonly created: string;

  public readonly name: string;
  public readonly sha: string;
  public readonly writeResContainer: ShaContainer;

  public static create(spi: ObjPouchInit): ObjPouchDocV1 {
    return new ObjPouchDocV1(spi);
  }

  private constructor(spi: ObjPouchInit) {
    this.type = this.constructor.name;
    this._id = spi._id || url.resolve(this.type, uuid.v4());
    this.created = spi.created || (new Date()).toISOString();

    this.name = spi.name;
    this.sha = spi.sha;
    this.writeResContainer = spi.writeResContainer;
  }

  public asObj(): ObjPouchDocV1 {
    return this;
  }

  public toWriteResContainer(tid: string): ShaContainer {
    return new ShaContainer({
    });
  }

  public toReadResContainer(tid: string): ReadResContainer {
    return new ReadResContainer({});
  }
}

export class ObjStoreProcessor {

  public readonly msgBus: MsgBus;

  public static create(msgBus: MsgBus): ObjStoreProcessor {
    return new ObjStoreProcessor(msgBus);
  }

  private pouchDbFrom(pc: PouchConfig): Promise<PouchDB.Database> {
    return new Promise<PouchDB.Database>((rs, rj) => {
      const tid = uuid.v4();
      const sub = this.msgBus.subscribe(msg => {
        PouchConnectionRes.is(msg).hasTid(tid).match(pcr => {
          sub.unsubscribe();
          rs(pcr.pouchDb);
        });
      });
      this.msgBus.next(new PouchConnectionReq(tid, pc));
    });
  }

  // private writeByName(pc: PouchConfig,
  //   name: string, block: Block, created: string,
  //   cb: (err: any, result: PouchDB.Core.Response) => void): void {
  //   this.pouchDbFrom(pc).then(pouchDb => {
  //     const sub = this.msgBus.subscribe(msg => {
  //       this
  //     });
  //     this.msgBus.next(new WriteReq({
  //       config: pc,
  //       tid: string;
  //       seq: number;
  //       block: Block;
  //     }));
  //     pouchDb.put(ObjPouchDocV1.create({
  //       sha: block.asSha(),
  //       block: block.asBase64()
  //     }).asObj()).then((result) => {
  //       cb(undefined, result);
  //     }).catch(err => {
  //       cb(err, undefined);
  //     });
  //   }).catch(err => {
  //     cb(err, undefined);
  //   });
  // }

  private readByName(pc: PouchConfig, sha: string,
    cb: (err: any, result: PouchDB.Find.FindResponse<ObjPouchDocV1>) => void): void {
    this.pouchDbFrom(pc).then(pouchDb => {
      pouchDb.find({
        selector: { sha: sha, type: ObjPouchDocV1.name },
        // fields: ['_id', 'type', 'sha', 'created', 'block'],
      }).then((result: PouchDB.Find.FindResponse<ObjPouchDocV1>) => {
        // console.log(sha, ShaPouchDocV1.name, result);
        cb(undefined, result);
      }).catch(err => {
        cb(err, undefined);
      });
    }).catch(err => {
      cb(err, undefined);
    });
  }

  private writeShaStore(msgBus: MsgBus, config: PouchConfig, tid: string, block: Block): Promise<ShaContainer> {
    return new Promise<ShaContainer>((rs, rj) => {
      const wrs = new ShaContainer({});
      const sub = msgBus.subscribe(msg => {
        WriteRes.is(msg).hasTid(tid).match(wr => {
          wrs.add(wr);
          if (wr.fragmentType & FragmentType.LAST) {
            sub.unsubscribe();
            rs(wrs);
          }
        });
      });
      msgBus.next(new WriteReq({
        config: config,
        tid: tid,
        seq: 0,
        block: block,
        fragmentType: FragmentType.COMMON | FragmentType.FIRST | FragmentType.LAST
      }));
    });
  }

  private toOne(res: PouchDB.Find.FindResponse<ObjPouchDocV1>): ObjPouchDocV1 {
    return res.docs.sort((a, b) => {
      if (a._id > b._id) {
        return 1;
      } else if (a._id < b._id) {
        return -1;
      } else {
        return 0;
      }
    })[0];
  }

  private writeAction(msgBus: MsgBus, fwq: WriteObjReq): void {
    this.writeShaStore(msgBus, fwq.config, fwq.tid, fwq.block).then(wsc => {
      this.readByName(fwq.config, wsc.sha, (err, result) => {
        if (err) {
          msgBus.next(new WriteObjRes({
            error: err,
            _id: 'Error',
            name: fwq.name,
            tid: fwq.tid,
            sha: wsc.sha,
            writeResContainer: new ShaContainer({})
          }));
          return;
        }
        if (result.docs.length === 0) {
          this.pouchDbFrom(fwq.config).then(pouchDb => {
            const doc = ObjPouchDocV1.create({
              name: fwq.name,
              sha: wsc.sha,
              writeResContainer: wsc
            });
            pouchDb.put(doc);
            msgBus.next(new WriteObjRes({
              _id: doc._id,
              name: fwq.name,
              created: doc.created,
              tid: fwq.tid,
              sha: wsc.sha,
              writeResContainer: doc.writeResContainer
            }));
          });
          return;
        }
        const my = this.toOne(result);
        msgBus.next(new WriteObjRes({
          _id: my._id,
          created: my.created,
          name: fwq.name,
          tid: fwq.tid,
          sha: wsc.sha,
          writeResContainer: my.writeResContainer
        }));
      });
    });
  }

  private readAction(msgBus: MsgBus, rmsg: ReadObjReq): void {
    this.readByName(rmsg.config, rmsg.name, (err, result) => {
      if (err) {
        msgBus.next(new ReadObjRes({
          tid: rmsg.tid,
          name: rmsg.name,
          readResContainers: [],
          error: err
        }));
        return;
      }
      if (result.docs.length == 0) {
        msgBus.next(new ReadObjRes({
          readResContainers: [],
          tid: rmsg.tid,
          name: rmsg.name
        }));
      } else {
        // console.log(result);
        const docs = result.docs.map(i => i.toReadResContainer(rmsg.tid));
        msgBus.next(new ReadObjRes({
          name: rmsg.name,
          tid: rmsg.tid,
          readResContainers: docs
        }));
      }
    });
  }

  private constructor(msgBus: MsgBus) {
    this.msgBus = msgBus;
    msgBus.subscribe(msg => {
      ReadObjReq.is(msg).match(rmsg => this.readAction(msgBus, rmsg));
      WriteObjReq.is(msg).match(wmsg => this.writeAction(msgBus, wmsg));
    });
  }

}
