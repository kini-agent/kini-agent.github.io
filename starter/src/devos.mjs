#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * 예전 이름으로 들어오는 입구. 하는 일은 `kini dev ...` 로 넘기는 것뿐입니다.
 *
 * ⚠️ 어느 워크스페이스를 쓰는지가 중요합니다. 예전에는 KINI_HOME 이 없으면
 * 무조건 ~/devos 를 썼습니다. 그래서 kini 로 설치한 사람이 습관대로 `devos`
 * 를 치는 순간 ~/devos 라는 **두 번째 워크스페이스**가 조용히 생기고, 프로젝트
 * 목록이 둘로 갈라졌습니다. 잘못됐다는 신호가 아무것도 없어서 한참 뒤에야
 * 압니다. 예전 워크스페이스가 실제로 있을 때만 그쪽을 봅니다.
 */
const isWorkspace = p => fs.existsSync(path.join(p,'_control')) || fs.existsSync(path.join(p,'projects'));

if (!process.env.KINI_HOME) {
  if (process.env.DEVOS_HOME) {
    process.env.KINI_HOME = process.env.DEVOS_HOME;
  } else {
    const legacy = path.join(os.homedir(),'devos');
    if (isWorkspace(legacy)) {
      process.env.KINI_HOME = legacy;
      console.warn(`[호환 안내] 예전 워크스페이스를 사용합니다: ${legacy}`);
    }
  }
}

process.argv.splice(2, 0, 'dev');
console.warn('\n[호환 안내] `devos` 명령은 계속 사용할 수 있지만 새 문서에서는 `kini dev`를 권장합니다.');
await import('./kini.mjs');
