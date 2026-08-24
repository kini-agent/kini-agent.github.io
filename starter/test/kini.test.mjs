/**
 * KINI 회귀 테스트.
 *
 * 여기 있는 것은 전부 실제로 한 번씩 났던 문제입니다. 사람이 쓰는 경로 그대로
 * (CLI 를 프로세스로 띄우고, 대화형 질문에 한 줄씩 답해서) 확인합니다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  KINI, DEVOS, tempHome, exists, read, kini, kiniInteractive, makeProject, git
} from './helpers.mjs';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(read(path.join(path.dirname(KINI), '..', 'package.json')));

test('버전은 package.json 하나만 본다', () => {
  const home = tempHome();
  const { out } = kini(['--version'], { home });
  assert.equal(out.trim(), pkg.version);
});

test('init 이 워크스페이스와 개인 profile 을 만든다', () => {
  const home = tempHome();
  const { code } = kini(['init'], { home });
  assert.equal(code, 0);
  for (const rel of ['_control/AGENTS.md', '_control/rules/ROUTING.md', 'profile/PROFILE.md', 'systems/devos/system.json', 'projects', 'worktrees']) {
    assert.ok(exists(path.join(home, rel)), `${rel} 이 없습니다`);
  }
});

test('init 을 다시 하면 옛날 Core 문서가 최신으로 갱신된다', () => {
  const home = tempHome();
  kini(['init'], { home });

  // 옛 버전에서 설치한 워크스페이스 흉내: 내용이 낡았고 manifest 도 없다.
  const doc = path.join(home, '_control', 'SYSTEMS.md');
  fs.writeFileSync(doc, '# KINI Systems\n\n- DevOS only\n');
  fs.rmSync(path.join(home, '_control', '.kini-managed.json'), { force: true });

  const { out } = kini(['init'], { home });
  assert.match(read(doc), /KINI Dev/);
  assert.match(out, /백업/);
});

test('직접 고친 Core 문서는 덮어쓰지 않는다', () => {
  const home = tempHome();
  kini(['init'], { home });
  const doc = path.join(home, '_control', 'AGENTS.md');
  fs.writeFileSync(doc, '# 내가 고친 규칙\n');

  const { out } = kini(['init'], { home });
  assert.equal(read(doc), '# 내가 고친 규칙\n');
  assert.match(out, /직접 고친 문서/);
});

test('시스템 등록 정보는 항상 다시 만들어진다', () => {
  const home = tempHome();
  kini(['init'], { home });
  const reg = path.join(home, 'systems', 'devos', 'system.json');
  fs.writeFileSync(reg, JSON.stringify({ schemaVersion: 1, commands: ['codex'] }));

  kini(['init'], { home });
  const after = JSON.parse(read(reg));
  assert.ok(after.commands.includes('agent'), 'agent 명령이 등록되어야 합니다');
  assert.ok(after.commands.includes('claude'));

  // 워크스페이스에 깔리는 것과 패키지가 싣고 있는 것이 같아야 합니다.
  const shipped = JSON.parse(read(path.join(path.dirname(KINI), '..', 'systems', 'devos', 'system.json')));
  assert.deepEqual(after, shipped);
});

test('모르는 옵션이 새 프로젝트 마법사를 열지 않는다', () => {
  const home = tempHome();
  const { code, out } = kini(['--verbose'], { home });
  assert.equal(code, 1);
  assert.match(out, /모르는 명령/);
});

test('새 프로젝트를 만들면 안내대로 다음 단계가 이어진다', async () => {
  const home = tempHome();
  const { code, out, root } = await makeProject(home);
  assert.equal(code, 0);
  assert.ok(exists(path.join(root, 'docs', 'SPEC.md')));
  assert.ok(exists(path.join(root, '.kini', 'dev', 'project.json')));
  // 안내가 특정 회사 CLI 를 지목하지 않는다.
  assert.match(out, /kini dev agent/);
  assert.doesNotMatch(out, /kini dev codex/);
});

test('만든 직후 바로 worktree 를 만들 수 있다', async () => {
  const home = tempHome();
  const { root } = await makeProject(home);
  assert.equal(git(['rev-parse', '--verify', 'HEAD'], root).status, 0, '첫 커밋이 있어야 합니다');

  const { code, out } = kini(['dev', 'worktree', 'new', 'calendar'], { home, cwd: root });
  assert.equal(code, 0, out);
  assert.ok(exists(path.join(home, 'worktrees', 't-app', 'calendar')), out);
});

test('개인 Profile 파일은 프로젝트 저장소에 커밋되지 않는다', async () => {
  const home = tempHome();
  const { root } = await makeProject(home);
  kini(['dev', 'status'], { home, cwd: root });

  assert.ok(exists(path.join(root, '.kini', 'KINI_PROFILE.md')), '프로필이 동기화되어야 합니다');
  const tracked = git(['status', '--porcelain', '--untracked-files=all'], root).stdout;
  assert.doesNotMatch(tracked, /KINI_PROFILE\.md/, '개인 프로필이 git 에 보이면 안 됩니다');
});

test('profile 로 더한 에이전트로 시작해도 개인 설정이 실린다', async () => {
  const home = tempHome();
  const { root } = await makeProject(home);
  // cmd 는 실제로 있는 실행 파일이어야 설치 검사를 통과합니다.
  const cmd = process.platform === 'win32' ? 'where' : 'true';
  fs.writeFileSync(path.join(home, 'profile', 'AGENTS.json'), JSON.stringify([{ id: 'gemini', label: 'Gemini CLI', cmd }]));

  kini(['dev', 'gemini'], { home, cwd: root });
  assert.ok(exists(path.join(root, '.kini', 'KINI_PROFILE.md')));
});

test('agent list 는 보여주기만 하고 프로젝트를 건드리지 않는다', async () => {
  const home = tempHome();
  const { root } = await makeProject(home);
  const profileFile = path.join(root, '.kini', 'KINI_PROFILE.md');

  kini(['dev', 'agent', 'list'], { home, cwd: root });
  assert.equal(exists(profileFile), false);
});

test('입력이 끊기면 실패로 끝나고 아무것도 만들지 않는다', async () => {
  const home = tempHome();
  const { code, out } = await kiniInteractive(['dev', 'new'], { home, answers: ['테스트 앱', 't-app'] });
  assert.notEqual(code, 0, '조용히 성공으로 끝나면 안 됩니다');
  assert.match(out, /취소/);
  assert.doesNotMatch(out, /unsettled/);
  assert.equal(exists(path.join(home, 'projects', 't-app')), false);
});

test('profile reset 미리보기가 실제 삭제 범위를 그대로 말한다', () => {
  const home = tempHome();
  kini(['init'], { home });
  fs.writeFileSync(path.join(home, 'profile', 'MY_NOTES.md'), '개인 메모\n');

  const preview = kini(['profile', 'reset'], { home }).out;
  assert.match(preview, /MY_NOTES\.md/, '함께 사라지는 파일을 알려야 합니다');

  kini(['profile', 'reset', '--yes'], { home });
  assert.equal(exists(path.join(home, 'profile', 'MY_NOTES.md')), false);
  const backups = fs.readdirSync(path.join(home, 'backups')).filter(n => n.startsWith('profile-'));
  assert.ok(backups.length >= 1, '백업이 남아야 합니다');
  assert.ok(exists(path.join(home, 'backups', backups[0], 'MY_NOTES.md')));
});

test('export 한 그대로 import 된다', () => {
  const home = tempHome();
  kini(['init'], { home });
  fs.writeFileSync(path.join(home, 'profile', 'STACKS.md'), '# Preferred Stacks\n\n## Web\n- Next.js\n');
  const outDir = path.join(home, '..', 'export');
  assert.equal(kini(['profile', 'export', outDir], { home }).code, 0);

  // 내보낸 뒤에 생긴 파일은 복원하면 없어야 합니다.
  fs.writeFileSync(path.join(home, 'profile', 'LATER.md'), '나중에 만든 것\n');
  fs.writeFileSync(path.join(home, 'profile', 'STACKS.md'), '# 덮어써진 내용\n');

  assert.equal(kini(['profile', 'import', outDir], { home }).code, 0);
  assert.match(read(path.join(home, 'profile', 'STACKS.md')), /Next\.js/);
  assert.equal(exists(path.join(home, 'profile', 'LATER.md')), false, '복원 결과가 내보낸 시점과 같아야 합니다');
});

test('profile show 는 직접 넣은 파일까지 보여준다', () => {
  const home = tempHome();
  kini(['init'], { home });
  fs.writeFileSync(path.join(home, 'profile', 'AGENTS.json'), '[]');
  const { out } = kini(['profile', 'show'], { home });
  assert.match(out, /AGENTS\.json/);
});

test('doctor 가 Node 버전 요구사항을 그대로 말한다', () => {
  const home = tempHome();
  const { out } = kini(['doctor'], { home });
  assert.match(out, new RegExp(`Node\\.js\\s+v${process.versions.node.replace(/\./g, '\\.')}`));
});

test('프로젝트 밖에서 status 를 치면 만든 프로젝트를 보여준다', async () => {
  const home = tempHome();
  await makeProject(home);
  const { out } = kini(['dev', 'status'], { home, cwd: os.tmpdir() });
  assert.match(out, /t-app/, '어디로 가야 하는지 알려줘야 합니다');
});

test('프로젝트가 하나도 없으면 만드는 법을 알려준다', () => {
  const home = tempHome();
  kini(['init'], { home });
  const { out } = kini(['dev', 'status'], { home, cwd: os.tmpdir() });
  assert.match(out, /kini dev new/);
});

test('doctor 도 profile 로 더한 에이전트를 안다', () => {
  const home = tempHome();
  kini(['init'], { home });
  const cmd = process.platform === 'win32' ? 'where' : 'true';
  fs.writeFileSync(path.join(home, 'profile', 'AGENTS.json'), JSON.stringify([{ id: 'gemini', label: 'Gemini CLI', cmd }]));
  const { out } = kini(['doctor'], { home });
  assert.match(out, /Gemini CLI/, 'kini dev agent list 와 같은 목록을 봐야 합니다');
});

test('깨진 AGENTS.json 을 조용히 무시하지 않는다', () => {
  const home = tempHome();
  kini(['init'], { home });
  fs.writeFileSync(path.join(home, 'profile', 'AGENTS.json'), '[{ "id": "gemini", }]');
  const { out } = kini(['dev', 'agent', 'list'], { home });
  assert.match(out, /경고/);
});

test('레거시 devos 가 두 번째 워크스페이스를 만들지 않는다', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'kini-fakehome-'));
  const env = { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome };
  delete env.KINI_HOME;
  delete env.DEVOS_HOME;

  const r = spawnSync(process.execPath, [DEVOS, 'status'], { encoding: 'utf8', env });
  assert.match(`${r.stdout}${r.stderr}`, /호환 안내/);
  assert.equal(exists(path.join(fakeHome, 'devos')), false, '~/devos 가 새로 생기면 안 됩니다');
});

test('예전 devos 워크스페이스가 있으면 그쪽을 그대로 쓴다', () => {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'kini-fakehome-'));
  fs.mkdirSync(path.join(fakeHome, 'devos', 'projects'), { recursive: true });
  const env = { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome };
  delete env.KINI_HOME;
  delete env.DEVOS_HOME;

  const r = spawnSync(process.execPath, [DEVOS, 'status'], { encoding: 'utf8', env });
  assert.match(`${r.stdout}${r.stderr}`, /예전 워크스페이스를 사용합니다/);
});
