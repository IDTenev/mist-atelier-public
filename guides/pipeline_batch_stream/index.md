# 파이프라인·배치·스트림: 데이터를 단계별 계약으로 처리하기

문서 0.1.0 · 검토 2026-09-19 · 수집·변환·분석 · Node.js 24 모델

## 개념과 특징

파이프라인은 입력을 검증·변환·집계·저장 같은 단계로 연결한다. 배치는 끝이 있는 묶음, 스트림은 계속 들어오는 입력을 다룬다. [Pipes and Filters 설명](https://learn.microsoft.com/en-us/azure/architecture/patterns/pipes-and-filters)은 입출력 계약으로 단계를 분리한다. 단계를 나눴다고 여러 서버가 필요한 것은 아니다.

단계 사이에는 backpressure, 즉 소비 속도에 맞춰 상류의 입력을 제한하는 계약이 필요하다. [Node.js 24.13.0 stream 문서](https://nodejs.org/download/release/v24.13.0/docs/api/stream.html)는 pipeline의 완료/오류 전달과 스트림 버퍼링을 설명한다. highWaterMark는 흐름 제어 기준이며 전체 프로세스 메모리의 절대 상한이 아니다.

## 구조와 동작

```text
원본 → 크기/형식 검증 → 단위 정규화 → 변환 → 저장
         ↓ reject                         ↓ checkpoint
     격리·원인 기록                    재시작 위치
```

단계의 입력/출력 schema와 버전을 기록한다. 필터 순서를 바꾸면 의미가 달라질 수 있다. 평균 뒤에 이상치 제거를 적용하는 것과 그 반대는 동일하지 않다. 스트리밍 집계에는 시간 창·늦은 입력·재계산 정책이 필요하다.

## 구현 순서

1. 원본 보존 여부와 최대 항목/묶음 크기를 정한다. 압축 해제 크기도 별도로 제한한다.
2. 순수 변환과 외부 저장 부작용을 분리하고 단계마다 잘못된 입력의 처리 정책을 정한다.
3. 동시 실행 수와 버퍼 한도를 정하고 가장 느린 단계에서 역압력이 전파되는지 확인한다.
4. 재실행 가능한 키와 checkpoint를 설계한다. 출력 반영 후 checkpoint 전 crash에서 중복 처리가 생길 수 있다.
5. 부분 실패 결과를 전부 성공으로 표시하지 말고 성공/격리/재시도 수를 따로 보고한다.

## 실행 가능한 호스트 예제

아래를 `pipeline_model.mjs`로 저장하고 `node pipeline_model.mjs`로 실행한다. 의도적으로 작은 입력을 사용하는 메모리 모델이다.

```javascript
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Validate one bounded record before converting millivolts to volts.
async function* normalize(source) {
    for await (const sample of source) {
        if (!Number.isSafeInteger(sample) || sample < 0 || sample > 5000) throw new RangeError('invalid millivolts');
        yield sample / 1000;
    }
}

// A local sink demonstrates completion and error propagation, not durable storage.
async function convert_batch(input) {
    if (input.length > 8) throw new RangeError('batch too large');
    const output = [];
    await pipeline(Readable.from(input), normalize, async function (source) {
        for await (const value of source) output.push(value);
    });
    return output;
}

assert.deepEqual(await convert_batch([0, 1234, 5000]), [0, 1.234, 5]);
assert.deepEqual(await convert_batch([]), []);
await assert.rejects(convert_batch([10, NaN, 20]), /invalid millivolts/);
await assert.rejects(convert_batch(Array(9).fill(1)), /batch too large/);
console.log('PASS: pipeline conversion, empty input, invalid record and size bound');
```

실제 저장 sink는 오류 전 일부 출력을 이미 반영했을 수 있다. pipeline의 reject가 저장소를 rollback한다는 뜻은 아니다. 이 모델의 출력 배열을 무한 스트림에 사용하지 않는다.

## 장점과 비용

단계별 시험·교체·재사용이 쉽고 큰 작업의 진행 상태를 설명하기 좋다. 반면 schema 변환·중간 저장·복사 비용과 지연이 늘 수 있다. 각 단계를 무조건 원격 서비스로 만들면 네트워크 비용이 처리 자체보다 커질 수 있다.

## 적용·비추천 조건

텔레메트리·로그·문서 변환·이미지 처리·ETL에 적합하다. 강하게 얽힌 상태를 아주 짧은 마감 안에 함께 갱신하는 제어 루프는 단계 간 복사·스케줄링을 먼저 측정한다. 단순 함수 두 개라면 직접 합성으로 충분하다.

## 검증과 전환

최대 입력, 느린 sink, 단계 예외, 취소, 중간 재시작, 같은 묶음 재처리를 시험한다. 기존 일괄 함수를 순수 변환 단계부터 나누고 처리량뿐 아니라 최대 메모리·대기 시간·복구 중복을 측정한다. [이벤트 전달](/guides/event_driven_pubsub)과 처리 파이프라인은 별개의 결정이다.

## 근거와 한계

출처는 2026-09-19 확인했다. 코드는 독자 작성한 Node 호스트 예제다. 실제 센서 정격·캘리브레이션, 영속 sink, 큰 데이터 성능, MCU 실기는 not_tested다.
