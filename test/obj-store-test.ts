import * as uuid from 'uuid';
import * as path from 'path';
import { mkdir } from 'fs';
import { assert } from 'chai';

import {
  MsgBus,
  PouchConnectionPoolProcessor,
  PouchConfig
} from 'foundation-store';
import { ShaStoreProcessor, StringBlock, ReadRes } from 'sha-store';
import { ObjStoreProcessor, ReadObjRes, ReadObjReq, WriteObjReq, WriteObjRes } from '../src';
import { ShaContainer } from '../src/msgs/sha-container';
import { ReadResContainer } from '../src/msgs/read-res-container';

describe('obj-store', () => {
  let pouchConfig: PouchConfig;
  before(done => {
    // console.log('setup');
    mkdir('.pdb', () => {
      pouchConfig = new PouchConfig({
        path: path.join('.pdb', uuid.v4())
      });
      done();
    });
  });

  after(done => {
    // console.log('teardown');
    done();
  });

  it.only('read unknown', (done) => {
    const tid = uuid.v4();
    const bus = new MsgBus();
    PouchConnectionPoolProcessor.create(bus);
    ShaStoreProcessor.create(bus);
    ObjStoreProcessor.create(bus);
    bus.subscribe(msg => {
      ReadObjRes.is(msg).hasTid(tid).match(ror => {
        try {
          assert.isOk(ror.isOk());
          assert.isOk(ror.name.startsWith('unknown'));
          assert.deepEqual(ror.readResContainers, []);
          done();
        } catch (e) {
          done(e);
        }

      });
    });
    bus.next(new ReadObjReq({
      tid: tid,
      name: `unknown ${tid}`,
      config: pouchConfig
    }));
  });

  it.only('write', (done) => {
    let tid = uuid.v4();
    const name = `write ${tid}`;
    const bus = new MsgBus();
    const block = new StringBlock(`tid ${tid}`);
    PouchConnectionPoolProcessor.create(bus);
    ShaStoreProcessor.create(bus);
    ObjStoreProcessor.create(bus);
    let count = 10;
    let first_msg: WriteObjRes;
    bus.subscribe(msg => {
      WriteObjRes.is(msg).hasTid(tid).match(wor => {
        try {
          if (!first_msg) {
            first_msg = wor;
          }
          assert.isOk(wor.isOk());
          if (!(--count > 0)) {
            done();
            return;
          }
          assert.equal(wor.name, name, 'name');
          assert.equal(wor._id, first_msg._id, '_id');
          assert.equal(wor.created, first_msg.created, 'created');
          assert.equal(wor.sha, 'b28c94b2195c8ed259f0b415aaee3f39b0b2920a4537611499fa044956917a21');
          assert.deepEqual(wor.writeResContainer, new ShaContainer({
              tid: wor.tid,
              created: first_msg.writeResContainer.created,
              writeRess: first_msg.writeResContainer.writeRess
          }));
          tid = uuid.v4();
          bus.next(new WriteObjReq({
            tid: tid,
            config: pouchConfig,
            name: name,
            block: block
          }));
        } catch (e) {
          done(e);
        }
      });
    });
    bus.next(new WriteObjReq({
      tid: tid,
      config: pouchConfig,
      name: name,
      block: block
    }));
  });

  it('read', (done) => {
    const writeTid = uuid.v4();
    let tid: string;
    const name = `read ${writeTid}`;
    const bus = new MsgBus();
    const block = new StringBlock(`tid ${writeTid}`);
    PouchConnectionPoolProcessor.create(bus);
    ShaStoreProcessor.create(bus);
    ObjStoreProcessor.create(bus);
    let count = 10;
    let writeObjRes: WriteObjRes;
    bus.subscribe(msg => {
      WriteObjRes.is(msg).hasTid(writeTid).match(wos => {
        writeObjRes = wos;
        tid = uuid.v4();
        bus.next(new ReadObjReq({
          tid: tid,
          name: name,
          config: pouchConfig
        }));
      });
      ReadObjRes.is(msg).hasTid(tid).match(ros => {
        if (!(--count > 0)) {
          done();
        }
        try {
          assert.isOk(ros.isOk());
          assert.equal(ros.name, name);
          // assert.equal(ros._id, writeObjRes._id);
          assert.deepEqual(ros.readResContainers, [
            new ReadResContainer({
              tid: ros.tid,
              created: writeObjRes.created,
            })
          ]);
          tid = uuid.v4();
          bus.next(new ReadObjReq({
            tid: tid,
            name: name,
            config: pouchConfig
          }));
        } catch (e) {
          done(e);
        }
      });
    });
    bus.next(new WriteObjReq({
      tid: writeTid,
      config: pouchConfig,
      name: name,
      block: block
    }));

  });

});
