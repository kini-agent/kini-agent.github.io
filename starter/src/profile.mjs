import fs from 'node:fs';
import path from 'node:path';

const ensure = p => fs.mkdirSync(p,{recursive:true});
const exists = p => fs.existsSync(p);

function defaultFiles(){
  return {
    'PROFILE.md': `# My KINI Profile\n\n이 폴더는 KINI Core와 분리된 개인 설정 공간입니다.\n\n- KINI를 업데이트해도 이 내용은 유지됩니다.\n- 공개 Core 저장소에는 개인 설정을 넣지 않습니다.\n- 비밀번호, API Key, 인증 토큰은 이 폴더에 저장하지 마세요.\n`,
    'PREFERENCES.md': `# Preferences\n\n자주 사용하는 개발 방식과 선호를 기록합니다.\n\n예:\n- TypeScript 프로젝트는 pnpm 우선\n- 모바일 앱은 Expo 우선 검토\n- 구현 후 테스트와 self-review를 반드시 수행\n`,
    'STACKS.md': `# Preferred Stacks\n\n프로젝트 유형별 기본 기술 선택을 기록합니다.\n\n## Web\n- TBD\n\n## Mobile\n- TBD\n\n## Backend\n- TBD\n`,
    'RULES.md': `# Personal Rules\n\nKINI의 공통 규칙 위에 추가할 개인 규칙을 기록합니다.\n\n중요:\n- 이 파일은 Core 규칙을 무효화하지 않습니다.\n- 삭제, 비용 발생, 운영 배포 같은 고위험 작업은 별도 승인을 유지합니다.\n`,
    'systems/dev/OVERRIDES.md': `# KINI Dev Overrides\n\nKINI Dev에서만 적용하고 싶은 개인 규칙을 기록합니다.\n`
  };
}

export function profilePath(kiniHome){
  return path.join(kiniHome,'profile');
}

export function ensureProfile(kiniHome){
  const root=profilePath(kiniHome);
  ensure(root);
  for(const [rel,content] of Object.entries(defaultFiles())){
    const p=path.join(root,rel);
    ensure(path.dirname(p));
    if(!exists(p)) fs.writeFileSync(p,content,'utf8');
  }
  const config=path.join(kiniHome,'config.json');
  if(!exists(config)){
    fs.writeFileSync(config,JSON.stringify({
      schemaVersion:1,
      profile:{enabled:true,source:'local'},
      safety:{requireApproval:['delete_data','external_cost','production_deploy','secret_access']}
    },null,2),'utf8');
  }
  return root;
}

export function buildProfileContext(kiniHome){
  const root=ensureProfile(kiniHome);
  const ordered=['PROFILE.md','PREFERENCES.md','STACKS.md','RULES.md','systems/dev/OVERRIDES.md'];
  const blocks=[];
  for(const rel of ordered){
    const p=path.join(root,rel);
    if(exists(p)) blocks.push(`\n## ${rel}\n\n${fs.readFileSync(p,'utf8').trim()}\n`);
  }
  return `# KINI Personal Profile Context\n\n이 파일은 KINI가 자동 생성합니다. 직접 수정하지 마세요.\nKINI Core/프로젝트 안전 규칙이 개인 Profile보다 항상 우선합니다.\n${blocks.join('\n')}`;
}

export function showProfile(kiniHome){
  const root=ensureProfile(kiniHome);
  console.log(`개인 KINI Profile\n`);
  console.log(`위치: ${root}`);
  console.log(`설정: ${path.join(kiniHome,'config.json')}\n`);
  console.log('Profile 파일');
  for(const rel of Object.keys(defaultFiles())) console.log(` - ${rel}`);
  console.log('\n이 폴더는 KINI Core 업데이트와 분리되어 유지됩니다.');
}

function copyDirectoryContents(src,dst){
  ensure(dst);
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const from=path.join(src,entry.name);
    const to=path.join(dst,entry.name);
    if(entry.isDirectory()) fs.cpSync(from,to,{recursive:true});
    else fs.copyFileSync(from,to);
  }
}

export function exportProfile(kiniHome,targetArg){
  const source=ensureProfile(kiniHome);
  if(!targetArg) throw new Error('내보낼 폴더를 입력하세요. 예: kini profile export ./my-kini-profile');
  const target=path.resolve(targetArg);
  if(exists(target) && fs.readdirSync(target).length>0) throw new Error(`대상 폴더가 비어 있지 않습니다: ${target}`);
  ensure(target);
  copyDirectoryContents(source,path.join(target,'profile'));
  const config=path.join(kiniHome,'config.json');
  if(exists(config)) fs.copyFileSync(config,path.join(target,'config.json'));
  fs.writeFileSync(path.join(target,'README.md'),`# KINI Profile Export\n\n이 폴더는 개인 KINI 설정 백업입니다.\n\n복원:\n\n  kini profile import "${target}"\n\n주의:\n- API Key, 비밀번호, 인증 토큰 같은 Secret은 포함하지 마세요.\n- KINI Core 프로그램 자체는 포함하지 않습니다.\n`,'utf8');
  console.log(`✓ Profile 내보내기 완료\n${target}`);
}

export function importProfile(kiniHome,sourceArg){
  if(!sourceArg) throw new Error('가져올 폴더를 입력하세요. 예: kini profile import ./my-kini-profile');
  const sourceRoot=path.resolve(sourceArg);
  const source=exists(path.join(sourceRoot,'profile'))?path.join(sourceRoot,'profile'):sourceRoot;
  if(!exists(source) || !fs.statSync(source).isDirectory()) throw new Error(`Profile 폴더를 찾을 수 없습니다: ${source}`);

  const profile=ensureProfile(kiniHome);
  const backup=path.join(kiniHome,'backups',`profile-${new Date().toISOString().replace(/[:.]/g,'-')}`);
  ensure(path.dirname(backup));
  fs.cpSync(profile,backup,{recursive:true});
  copyDirectoryContents(source,profile);

  const importedConfig=path.join(sourceRoot,'config.json');
  if(exists(importedConfig)) fs.copyFileSync(importedConfig,path.join(kiniHome,'config.json'));

  console.log('✓ Profile 가져오기 완료');
  console.log(`✓ 기존 Profile 백업: ${backup}`);
}

export function resetProfile(kiniHome,args=[]){
  const yes=args.includes('--yes');
  const root=ensureProfile(kiniHome);
  if(!yes){
    console.log('Profile reset 미리보기\n');
    console.log(`초기화 대상: ${root}`);
    console.log('다음 개인 파일을 기본 템플릿으로 되돌립니다.');
    for(const rel of Object.keys(defaultFiles())) console.log(` - ${rel}`);
    console.log('\n프로젝트와 KINI Core는 삭제하지 않습니다.');
    console.log('실제로 초기화하려면: kini profile reset --yes');
    return;
  }

  const backup=path.join(kiniHome,'backups',`profile-${new Date().toISOString().replace(/[:.]/g,'-')}`);
  ensure(path.dirname(backup));
  fs.cpSync(root,backup,{recursive:true});
  fs.rmSync(root,{recursive:true,force:true});
  ensureProfile(kiniHome);
  console.log('✓ Profile을 기본값으로 초기화했습니다.');
  console.log(`✓ 기존 Profile 백업: ${backup}`);
}
