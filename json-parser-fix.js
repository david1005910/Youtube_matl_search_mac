// JSON 파싱 오류 수정 패치
// app.js 파일의 safeParseJSON 함수를 이 코드로 교체하세요

function safeParseJSON(raw) {
  try {
    // 1) ```json ... ``` 코드블록 추출
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    let src = codeBlock ? codeBlock[1] : raw;

    // 2) 첫 번째 { 부터 마지막 } 까지 추출
    const start = src.indexOf('{');
    const end = src.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('JSON 블록을 찾을 수 없습니다.');
    }
    src = src.slice(start, end + 1);

    // 3) 직접 파싱 시도
    try {
      return JSON.parse(src);
    } catch (e) {
      console.log('첫 번째 JSON 파싱 실패:', e.message);
    }

    // 4) 일반적인 Gemini JSON 오류 수정
    let fixed = src
      .replace(/,\s*([}\]])/g, '$1')                    // 후행 콤마 제거
      .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":') // 따옴표 없는 키 수정
      .replace(/:\s*'([^']*)'/g, ': "$1"')              // 단따옴표 → 이중따옴표
      .replace(/:\s*`([^`]*)`/g, ': "$1"');             // 백틱 → 이중따옴표

    // 제어문자 처리 (더 정확한 방법)
    fixed = fixed.split('').map(char => {
      const code = char.charCodeAt(0);
      // 탭(9), 줄바꿈(10), 캐리지리턴(13)은 유지, 나머지 제어문자는 공백으로
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        return ' ';
      }
      return char;
    }).join('');

    // 줄바꿈 이스케이프
    fixed = fixed
      .replace(/\r\n/g, '\\n')  // Windows 줄바꿈
      .replace(/\n/g, '\\n')    // Unix 줄바꿈
      .replace(/\r/g, '\\n')    // Mac 줄바꿈
      .replace(/\t/g, '\\t');   // 탭

    try {
      return JSON.parse(fixed);
    } catch (e) {
      console.log('두 번째 JSON 파싱 실패:', e.message);
    }

    // 5) 문자열 내용 보존하면서 줄바꿈을 공백으로 치환
    const fixed2 = src
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
      .replace(/[\r\n\t]+/g, ' ')    // 모든 줄바꿈과 탭을 공백으로
      .replace(/\s+/g, ' ')           // 연속 공백을 하나로
      .trim();

    // 제어문자 완전 제거
    const fixed3 = fixed2.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10 || code === 13;
    }).join('');

    try {
      return JSON.parse(fixed3);
    } catch (e) {
      console.log('세 번째 JSON 파싱 실패:', e.message);
      console.log('문제가 된 JSON 일부:', fixed3.substring(0, 200));
    }

    // 6) 최후의 시도: 매우 관대한 파싱
    const lines = src.split(/[\r\n]+/);
    const cleanLines = lines.map(line => line.trim()).filter(line => line);
    const oneLineJson = cleanLines.join(' ');
    
    const fixed4 = oneLineJson
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
      .replace(/:\s*undefined/gi, ': null')
      .replace(/:\s*NaN/gi, ': null')
      .replace(/:\s*Infinity/gi, ': null')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/:\s*`([^`]*)`/g, ': "$1"');

    return JSON.parse(fixed4);
    
  } catch (error) {
    console.error('JSON 파싱 최종 실패:', error);
    console.error('원본 데이터 일부:', raw ? raw.substring(0, 300) : 'N/A');
    
    // 빈 객체 반환 (앱이 완전히 멈추지 않도록)
    console.warn('기본값으로 빈 객체를 반환합니다.');
    return {};
  }
}

// 사용 예시:
// 이 함수를 app.js의 2-32줄의 safeParseJSON 함수와 교체하세요
console.log('JSON 파서 수정 패치가 준비되었습니다.');