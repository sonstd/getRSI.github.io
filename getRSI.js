var submitted = false;

async function submit(){
  if(submitted){
    alert('이미 조회중입니다.');
    return;
  }

  submitted = true;
  document.getElementById('status').innerText = '조회중...'
  reset();

  const period = Number(document.getElementById('input-box1').value);
  const candle = document.getElementById('input-box2').value;

  console.log(`rsi-${period}, ${candle}봉에 대한 데이터 조회 시작`);

  var candle_url = '';
  if(candle == '주') candle_url = 'weeks';
  else if(candle == '일') candle_url = 'days';
  else if(candle == '240분') candle_url = 'minutes/240';
  else if(candle == '60분') candle_url = 'minutes/60';

  const res_all_tickers = await fetch('https://api.upbit.com/v1/market/all');
  const res_all_ticker_json = await res_all_tickers.json();
  const KRW_tickers = [];
  res_all_ticker_json.forEach(data => {
    if(data.market.split('-')[0] == 'KRW') KRW_tickers.push(data.market);
  });
  
  const tickers_data = [];
  for(let i=0; i<KRW_tickers.length; i++){
    try{
      const data = await fetch(`https://api.upbit.com/v1/candles/${candle_url}?market=${KRW_tickers[i]}&count=150`, {
        mode: 'cors',
      });
      const data_json = await data.json()
      if(data_json.length == 150) tickers_data.push(data_json);
    }
    catch(error){
      console.log(error)
      alert('요청 오류 발생 - 새로고침 후 재시도 해주세요');
      return;
    }
    await sleep(100);
  }

  const tickers_rsi = [];
  tickers_data.forEach(data => {
    const delta = [];
    for(let i=0; i<149; i++){
      delta.push(Number(data[i].trade_price) - Number(data[i+1].trade_price));
    }

    const up = delta.map(val => {
      if(val < 0) return 0;
      else return val;
    });

    const down = delta.map(val => {
      if(val > 0) return 0;
      else return val * -1;
    });

    var initial_au = 0;
    var initial_ad = 0;
    for(let i=delta.length - period; i<delta.length; i++){
      initial_au += up[i];
      initial_ad += down[i];
    }

    const ewm_alpha = 1/period;
    const au = [];
    const ad = [];
    au.push(initial_au);
    ad.push(initial_ad);

    var index = 0;
    for(let i=delta.length - period - 1; i>= 0; i--){
      au.push(au[index]*(1 - ewm_alpha) + up[i]*ewm_alpha);
      ad.push(ad[index]*(1 - ewm_alpha) + down[i]*ewm_alpha);
      index++;
    }

    const today_rs = au[au.length -1]/ad[ad.length -1];
    const yesterday_rs = au[au.length -2]/ad[ad.length -2];
    
    const today_rsi = (100*today_rs)/(1+today_rs);
    const yesterday_rsi = (100*yesterday_rs)/(1+yesterday_rs);

    var rsi_delta = today_rsi - yesterday_rsi;
    if(rsi_delta >= 0) rsi_delta = '+' + (Math.round(rsi_delta*100)/100);
    else rsi_delta = (Math.round(rsi_delta*100)/100);

    tickers_rsi.push([data[0].market, Math.round(today_rsi * 100)/100, rsi_delta]);
  });

  tickers_rsi.sort((a, b) => a[1] - b[1]);

  output(tickers_rsi);
  document.getElementById('status').innerText = '조회 완료';
  submitted = false;
}

function reset(){
  document.getElementById('output-box').removeChild(document.getElementById('results'));

  const newResults = document.createElement('div');
  newResults.id = 'results';
  document.getElementById('output-box').appendChild(newResults)
}

function output(results){
  results.forEach(result => {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'ticker_name';
    const rsiDiv = document.createElement('div');
    rsiDiv.className = 'rsi_value';
    const rsiDeltaDiv = document.createElement('div');
    rsiDeltaDiv.className = 'rsi_delta';

    document.getElementById('results').appendChild(resultDiv);
    nameDiv.innerText = result[0];
    rsiDiv.innerText = result[1];
    rsiDeltaDiv.innerText = result[2];
    resultDiv.appendChild(nameDiv);
    resultDiv.appendChild(rsiDiv);
    resultDiv.appendChild(rsiDeltaDiv);
  });
}

const sleep = ms => {
  return new Promise(r => setTimeout(r, ms));
}