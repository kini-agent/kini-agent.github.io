#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';

if (!process.env.KINI_HOME) {
  process.env.KINI_HOME = process.env.DEVOS_HOME || path.join(os.homedir(), 'devos');
}

process.argv.splice(2, 0, 'dev');
console.warn('\n[호환 안내] `devos` 명령은 계속 사용할 수 있지만 새 문서에서는 `kini dev`를 권장합니다.');
await import('./kini.mjs');
