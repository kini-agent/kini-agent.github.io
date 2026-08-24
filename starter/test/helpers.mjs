import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.join(here, '..', 'src');
export const KINI = path.join(SRC, 'kini.mjs');
export const DEVOS = path.join(SRC, 'devos.mjs');

export function tempHome(name='kini'){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kini-test-'));
  return path.join(dir, name);
}

export function exists(p){ return fs.existsSync(p); }
export function read(p){ return fs.readFileSync(p, 'utf8'); }

/** 비대화형 명령 실행. */
export function kini(args, { home, env = {}, cwd } = {}){
  const r = spawnSync(process.execPath, [KINI, ...args], {
    encoding: 'utf8',
    cwd: cwd || process.cwd(),
    env: { ...process.env, KINI_HOME: home, ...env }
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/**
 * 대화형 명령 실행.
 *
 * ⚠️ 답을 한 번에 파이프로 밀어 넣으면 readline 이 EOF 를 먼저 만나 중간에
 * 멈춥니다. 사람이 치듯 한 줄씩 넣어야 실제 사용과 같은 경로를 지납니다.
 */
export function kiniInteractive(args, { home, answers = [], env = {}, cwd, timeout = 20000 } = {}){
  return new Promise(resolve => {
    const p = spawn(process.execPath, [KINI, ...args], {
      cwd: cwd || process.cwd(),
      env: { ...process.env, KINI_HOME: home, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let out = '';
    let i = 0;
    let pending = null;

    // 질문이 화면에 나온 다음에 답합니다. 고정 간격으로 밀어 넣으면 느린 머신에서
    // 답이 모자란 채 stdin 이 닫혀 테스트가 제 이유 없이 깨집니다.
    const step = () => {
      if (i < answers.length) p.stdin.write(answers[i++] + '\n');
      else p.stdin.end();
    };
    const onOutput = d => {
      out += d;
      clearTimeout(pending);
      pending = setTimeout(step, 40);
    };
    p.stdout.on('data', onOutput);
    p.stderr.on('data', onOutput);

    const guard = setTimeout(() => p.kill('SIGKILL'), timeout);
    p.on('exit', code => { clearTimeout(pending); clearTimeout(guard); resolve({ code, out }); });
  });
}

export const NEW_PROJECT_ANSWERS = [
  '테스트 앱',            // 무엇을 만들어볼까요
  't-app',                // 폴더명
  '',                     // 이름 (기본)
  '',                     // 개발 모드
  '',                     // 주 언어
  '',                     // 플랫폼
  '',                     // 자율성
  '',                     // 사용자
  '기록할 곳이 없음',      // 문제
  '기록, 보기',            // MVP
  ''                      // 데이터 저장
];

export async function makeProject(home){
  const r = await kiniInteractive(['dev', 'new'], { home, answers: NEW_PROJECT_ANSWERS });
  return { ...r, root: path.join(home, 'projects', 't-app') };
}

export function git(args, cwd){
  return spawnSync('git', args, { encoding: 'utf8', cwd });
}
