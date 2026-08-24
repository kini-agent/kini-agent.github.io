import fs from 'node:fs';
import path from 'node:path';
import { runDevOS as runBaseDevOS, isAgentCommand, PROJECT_GITIGNORE, ensureAgentBridges } from './devos.mjs';
import { buildProfileContext, ensureProfile } from '../profile.mjs';

const exists=p=>fs.existsSync(p);

function projectRoot(){
  let p=process.cwd();
  while(true){
    if(exists(path.join(p,'.kini','dev','project.json')) || exists(path.join(p,'.devos','project.json'))) return p;
    const q=path.dirname(p);
    if(q===p) return null;
    p=q;
  }
}

function syncProfile(root,kiniHome){
  if(!root) return;
  ensureProfile(kiniHome);
  const contextDir=path.join(root,'.kini');
  fs.mkdirSync(contextDir,{recursive:true});
  const contextPath=path.join(contextDir,'KINI_PROFILE.md');
  fs.writeFileSync(contextPath,buildProfileContext(kiniHome),'utf8');

  /**
   * ⚠️ 방금 쓴 KINI_PROFILE.md 는 개인 설정입니다. 무시 규칙이 없으면 다음
   * 커밋에 그대로 딸려 들어갑니다. 이미 만들어진 프로젝트에도 여기서 채웁니다.
   */
  const ignorePath=path.join(root,'.gitignore');
  const rule='.kini/KINI_PROFILE.md';
  if(exists(ignorePath)){
    const current=fs.readFileSync(ignorePath,'utf8');
    if(!current.split(/\r?\n/).some(l=>l.trim()===rule))
      fs.appendFileSync(ignorePath,`${current.endsWith('\n')?'':'\n'}${rule}\n`,'utf8');
  } else {
    fs.writeFileSync(ignorePath,PROJECT_GITIGNORE,'utf8');
  }

  // 이미 만들어진 프로젝트에도 규칙을 읽히게 하는 다리를 놓습니다.
  ensureAgentBridges(root,kiniHome);

  const agentsPath=path.join(root,'AGENTS.md');
  const note='- 작업 시작 전에 .kini/KINI_PROFILE.md를 읽고 개인 선호를 적용합니다. 단, Core/프로젝트의 안전 규칙이 항상 우선합니다.';
  if(exists(agentsPath)){
    const current=fs.readFileSync(agentsPath,'utf8');
    if(!current.includes('.kini/KINI_PROFILE.md')) fs.appendFileSync(agentsPath,`\n${note}\n`,'utf8');
  }
}

export async function runDevOS(args,{kiniHome}){
  const [cmd,...rest]=args;

  /**
   * ⚠️ 에이전트를 띄우기 **전에** 프로필을 내려놔야 합니다. 예전에는 `codex`
   * 라는 이름만 봤기 때문에 다른 에이전트로 시작하면 개인 설정이 반영되지
   * 않은 채로 돌았습니다. 조용히 틀리는 부류라 목록을 여기에 또 적지 않고
   * devos.mjs 의 판단을 그대로 씁니다. profile 로 더한 에이전트도 같이 걸립니다.
   *
   * `agent list` 는 무엇이 있는지 보여주기만 하므로 파일을 건드리지 않습니다.
   */
  const listingAgents = cmd==='agent' && rest[0]==='list';
  const opensAgent = !listingAgents && (cmd==='status' || isAgentCommand(cmd,kiniHome));
  if(opensAgent){
    const root=projectRoot();
    if(root) syncProfile(root,kiniHome);
  }

  await runBaseDevOS(args,{kiniHome});

  // 새 프로젝트 생성이 끝난 직후에는 현재 작업 디렉터리가 프로젝트가 아닐 수 있으므로
  // Profile은 첫 status/agent 실행 시 자동으로 동기화됩니다.
}
