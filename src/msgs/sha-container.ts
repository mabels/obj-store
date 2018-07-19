import * as crypto from 'crypto';

import { WriteRes } from 'sha-store';

export interface ShaContainerInit {
  readonly shaStoreRefs?: WriteRes[];
}

export class ShaContainer implements ShaContainerInit {
  public readonly shaStoreRefs: WriteRes[];

  public constructor(wrci: ShaContainerInit) {
    // this.writeRess = wrci.writeRess || [];
  }

  public add(ws: WriteRes): void {
    this.writeRess.push(ws);
  }

  public get sha(): string {
    return crypto.createHash('sha256')
      .update(this.writeRess.sort((a, b) => a.seq - b.seq).join(''))
      .digest('hex');
  }
}
