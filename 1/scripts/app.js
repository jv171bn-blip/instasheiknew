(() => {
  const modal = document.getElementById('pix-modal');
  console.log('modal:', modal);
  const closeBtn = modal.querySelector('.modal-close');
  console.log('closeBtn:', closeBtn);
  const qrImg = document.getElementById('pix-qr-img');
  console.log('qrImg:', qrImg);
  const qrSkeleton = document.getElementById('pix-qr-skeleton');
  console.log('qrSkeleton:', qrSkeleton);
  const pixCodeInput = document.getElementById('pix-code');
  console.log('pixCodeInput:', pixCodeInput);
  const copyBtn = document.getElementById('btn-copy-code');
  console.log('copyBtn:', copyBtn);
  const statusEl = document.getElementById('pix-status');
  console.log('statusEl:', statusEl);
  const amountEl = document.getElementById('pix-amount');
  console.log('amountEl:', amountEl);
  const configWarning = document.getElementById('config-warning');
  console.log('configWarning:', configWarning);
  const pixLeft = document.getElementById('pix-left');
  console.log('pixLeft:', pixLeft);
  const pixProcessingState = document.getElementById('pix-processing-state');
  console.log('pixProcessingState:', pixProcessingState);

  const ctaBtn = document.querySelector('.cta');
  console.log('ctaBtn:', ctaBtn);

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    qrImg.classList.add('hidden');
    qrImg.src = '';
    pixCodeInput.value = '';
    statusEl.textContent = '';
    configWarning.textContent = '';
    qrSkeleton.style.display = 'block';
    pixLeft.classList.remove('hidden');
    pixProcessingState.classList.add('hidden');
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function randomName() {
    const first = ['Ana','Bruno','Carla','Diego','Fernanda','Gabriel','Helena','Igor','João','Larissa','Marcos','Nina','Otávio','Paula','Rafael','Sofia'];
    const last = ['Silva','Souza','Oliveira','Pereira','Costa','Ribeiro','Almeida','Ferreira','Carvalho','Gomes'];
    return `${first[randomInt(0, first.length-1)]} ${last[randomInt(0, last.length-1)]}`;
  }
  function randomEmail() {
    const user = `cliente${Date.now().toString().slice(-6)}${randomInt(10,99)}`;
    return `${user}@instasheik.com`;
  }
  function randomPhone() {
    return `11${randomInt(900000000, 999999999)}`; // DDD 11 + celular
  }
  function uniqueRef() {
    return `IS-${Date.now()}-${randomInt(1000,9999)}`;
  }

  async function createPixTransaction() {
    const cfg = Object.assign({}, window.PIX_CONFIG || {}, window.PIX_CRED || {});
    const { API_URL, API_KEY, PRODUCT_HASH, AMOUNT_CENTS, DESCRIPTION } = cfg;

    console.log('PIX Config:', cfg);

    if (!API_URL || !API_KEY || !PRODUCT_HASH || !AMOUNT_CENTS) {
      configWarning.textContent = 'Configuração ausente: defina API_KEY e PRODUCT_HASH.';
      console.error('Configuração PIX ausente:', { API_URL, API_KEY, PRODUCT_HASH, AMOUNT_CENTS });
      return;
    }

    amountEl.textContent = `Valor: R$ ${(AMOUNT_CENTS/100).toFixed(2).replace('.', ',')}`;
    pixLeft.classList.add('hidden');
    pixProcessingState.classList.remove('hidden');

    const payload = {
      amount: AMOUNT_CENTS,
      description: DESCRIPTION || 'Insta Sheik',
      reference: uniqueRef(),
      productHash: PRODUCT_HASH,
      customer: {
        name: randomName(),
        email: randomEmail(),
        phone: randomPhone(),
        document: '22608725813',
      },
    };

    console.log('Payload enviado:', payload);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(payload),
      });
      console.log('Resposta bruta da API:', res);
      const data = await res.json().catch(() => ({}));
      console.log('Dados da resposta da API:', data);
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.error || 'Falha ao criar transação');
      }
      // Mostrar QR e código
      if (data.qr_code_base64) {
        const base64 = String(data.qr_code_base64);
        qrImg.src = base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
        qrImg.classList.remove('hidden');
        qrSkeleton.style.display = 'none';
      }
      if (data.qr_code) {
        pixCodeInput.value = data.qr_code;
        // Fallback: se não veio a imagem base64, gerar via serviço de QR
        if (qrImg.classList.contains('hidden')) {
          const qru = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.qr_code)}`;
          qrImg.src = qru;
          qrImg.classList.remove('hidden');
          qrSkeleton.style.display = 'none';
        }
      }
      statusEl.textContent = data.expires_at ? `Expira: ${data.expires_at}` : 'Aguardando pagamento...';
      pixProcessingState.classList.add('hidden');
      pixLeft.classList.remove('hidden');
    } catch (err) {
      console.error('Erro na transação PIX:', err);
      statusEl.textContent = `Erro: ${(err && err.message) || 'Não foi possível gerar o PIX'}`;
      qrSkeleton.style.display = 'none';
      pixProcessingState.classList.add('hidden');
      pixLeft.classList.remove('hidden');
    }
  }

  // Eventos
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      openModal();
      qrImg.classList.add('hidden');
      qrSkeleton.style.display = 'block';
      pixCodeInput.value = '';
      createPixTransaction();
    });
  }
  closeBtn.addEventListener('click', closeModal);
  modal.querySelector('.overlay').addEventListener('click', closeModal);
  copyBtn.addEventListener('click', async () => {
    if (!pixCodeInput.value) return;
    try {
      await navigator.clipboard.writeText(pixCodeInput.value);
      statusEl.textContent = 'Código PIX copiado!';
    } catch {
      statusEl.textContent = 'Não foi possível copiar. Selecione e copie manualmente.';
    }
  });
})();
