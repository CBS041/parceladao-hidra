(() => {
  const apiPath = '/api';

  const authWrap = document.getElementById('admin-auth-wrap');
  const authForm = document.getElementById('admin-auth-form');
  const authEmail = document.getElementById('admin-auth-email');
  const authPassword = document.getElementById('admin-auth-password');
  const authErrorNode = document.getElementById('admin-auth-error');
  const authSubmitButton = document.getElementById('admin-auth-submit');
  const dashboardWrap = document.getElementById('admin-dashboard');
  const changeCredentialsButton = document.getElementById('admin-change-credentials');
  const logoutButton = document.getElementById('admin-logout');

  const credentialsModal = document.getElementById('credentials-modal');
  const credentialsForm = document.getElementById('credentials-form');
  const credentialsCloseButton = document.getElementById('credentials-close');
  const credentialsCancelButton = document.getElementById('credentials-cancel');
  const credentialsSubmitButton = document.getElementById('credentials-submit');
  const credentialsEmail = document.getElementById('credentials-email');
  const credentialsCurrentPassword = document.getElementById('credentials-current-password');
  const credentialsNewPassword = document.getElementById('credentials-new-password');
  const credentialsConfirmPassword = document.getElementById('credentials-confirm-password');
  const credentialsErrorNode = document.getElementById('credentials-error');
  const credentialsSuccessNode = document.getElementById('credentials-success');

  const totalCountNode = document.getElementById('admin-total-count');
  const totalAmountNode = document.getElementById('admin-total-amount');
  const lastCreatedNode = document.getElementById('admin-last-created');
  const emptyNode = document.getElementById('admin-empty');
  const cardsWrap = document.getElementById('admin-cards-wrap');
  const cardsNode = document.getElementById('admin-cards');
  const tableWrap = document.getElementById('admin-table-wrap');
  const rowsNode = document.getElementById('admin-rows');

  const addManualButton = document.getElementById('add-manual');
  const exportCsvButton = document.getElementById('export-csv');
  const clearAllButton = document.getElementById('clear-all');

  const manualModal = document.getElementById('manual-modal');
  const manualForm = document.getElementById('manual-form');
  const manualCloseButton = document.getElementById('manual-close');
  const manualCancelButton = document.getElementById('manual-cancel');
  const manualErrorNode = document.getElementById('manual-form-error');
  const manualReceiptErrorNode = document.getElementById('manual-receipt-error');

  const manualReceiptPreview = document.getElementById('manual-receipt-preview');
  const manualReceiptPreviewImage = document.getElementById('manual-receipt-preview-image');
  const manualReceiptPreviewPdf = document.getElementById('manual-receipt-preview-pdf');
  const manualReceiptPreviewPdfName = document.getElementById('manual-receipt-preview-pdf-name');
  const manualReceiptPreviewPdfFrame = document.getElementById('manual-receipt-preview-pdf-frame');
  const manualReceiptPreviewMeta = document.getElementById('manual-receipt-preview-meta');

  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitleNode = document.getElementById('confirm-title');
  const confirmMessageNode = document.getElementById('confirm-message');
  const confirmCancelButton = document.getElementById('confirm-cancel');
  const confirmAcceptButton = document.getElementById('confirm-accept');

  const receiptModal = document.getElementById('receipt-modal');
  const receiptModalName = document.getElementById('receipt-modal-name');
  const receiptModalDownload = document.getElementById('receipt-modal-download');
  const receiptModalImage = document.getElementById('receipt-modal-image');
  const receiptModalPdf = document.getElementById('receipt-modal-pdf');
  const receiptModalCloseButton = document.getElementById('receipt-modal-close');

  const maxFileSizeBytes = 5 * 1024 * 1024;
  let manualPreviewObjectUrl = null;
  let confirmResolver = null;
  let currentAdminEmail = '';

  const manualFields = {
    fullName: document.getElementById('manual-fullName'),
    phone: document.getElementById('manual-phone'),
    savedAmount: document.getElementById('manual-savedAmount'),
    depositDate: document.getElementById('manual-depositDate'),
    receipt: document.getElementById('manual-receipt'),
  };

  const isPdfFile = (file) => Boolean(file) && (
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  );

  const isSupportedImageFile = (file) => Boolean(file) && [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ].includes(file.type);

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Falha na requisição.' }));
      const error = new Error(errorData.error || 'Falha na requisição.');
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };

  const setAuthError = (message) => {
    if (!authErrorNode) {
      return;
    }

    if (!message) {
      authErrorNode.textContent = '';
      authErrorNode.classList.add('hidden');
      return;
    }

    authErrorNode.textContent = message;
    authErrorNode.classList.remove('hidden');
  };

  const setCredentialsError = (message) => {
    if (!credentialsErrorNode) {
      return;
    }

    if (!message) {
      credentialsErrorNode.textContent = '';
      credentialsErrorNode.classList.add('hidden');
      return;
    }

    credentialsErrorNode.textContent = message;
    credentialsErrorNode.classList.remove('hidden');
  };

  const setCredentialsSuccess = (message) => {
    if (!credentialsSuccessNode) {
      return;
    }

    if (!message) {
      credentialsSuccessNode.textContent = '';
      credentialsSuccessNode.classList.add('hidden');
      return;
    }

    credentialsSuccessNode.textContent = message;
    credentialsSuccessNode.classList.remove('hidden');
  };

  const closeCredentialsModal = () => {
    if (!credentialsModal || !credentialsForm) {
      return;
    }
    credentialsModal.classList.add('hidden');
    credentialsModal.classList.remove('flex');
    document.body.style.overflow = '';
    credentialsForm.reset();
    setCredentialsError('');
    setCredentialsSuccess('');
  };

  const openCredentialsModal = () => {
    if (!credentialsModal || !credentialsForm) {
      return;
    }
    credentialsModal.classList.remove('hidden');
    credentialsModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setCredentialsError('');
    setCredentialsSuccess('');
    credentialsForm.reset();
    if (credentialsEmail && currentAdminEmail) {
      credentialsEmail.value = currentAdminEmail;
    }
    credentialsEmail?.focus();
  };

  const showAuthView = () => {
    authWrap?.classList.remove('hidden');
    dashboardWrap?.classList.add('hidden');
    closeAllActionMenus();
    closeManualModal();
    closeReceiptModal();
    closeConfirmation(false);
    closeCredentialsModal();
    if (authPassword) {
      authPassword.value = '';
    }
    authEmail?.focus();
  };

  const showDashboardView = () => {
    setAuthError('');
    authWrap?.classList.add('hidden');
    dashboardWrap?.classList.remove('hidden');
  };

  const checkSession = async () => {
    try {
      const session = await requestJson(`${apiPath}/auth/session`);
      currentAdminEmail = String(session && session.email || '');
      if (authEmail && currentAdminEmail) {
        authEmail.value = currentAdminEmail;
      }
      showDashboardView();
      return true;
    } catch (error) {
      showAuthView();
      return false;
    }
  };

  const login = async (email, password) => {
    const payload = await requestJson(`${apiPath}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    currentAdminEmail = String(payload && payload.email || email);
    if (authEmail) {
      authEmail.value = currentAdminEmail;
    }
    showDashboardView();
  };

  const logout = async () => {
    try {
      await requestJson(`${apiPath}/auth/logout`, { method: 'POST' });
    } catch (_error) {
      // Mesmo com falha de rede, limpamos estado local para não manter painel aberto.
    }
    currentAdminEmail = '';
    showAuthView();
  };

  const toAbsoluteUrl = (value) => {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }
    if (/^https?:\/\//i.test(text)) {
      return text;
    }
    return `${window.location.origin}${text.startsWith('/') ? text : `/${text}`}`;
  };

  const formatDateTime = (iso) => {
    if (!iso) {
      return '-';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('pt-BR');
  };

  const formatCurrency = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return '-';
    }

    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapeCsv = (value) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  const toWhatsappNumber = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) {
      return '';
    }
    if (digits.startsWith('55')) {
      return digits;
    }
    return `55${digits}`;
  };

  const buildWhatsappLink = (item) => {
    const phone = toWhatsappNumber(item.phone);
    if (!phone) {
      return '';
    }

    const message = `Olá ${item.fullName}, tudo bem? Estou entrando em contato sobre sua inscrição no Parceladão da Hidra. \n Preciso que você faça o cadastro nesse link: \n https://uni.tbvou.com.br/login \n`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const syncResponsiveDataViews = () => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      cardsWrap.classList.add('hidden');
      tableWrap.classList.remove('hidden');
      return;
    }

    cardsWrap.classList.remove('hidden');
    tableWrap.classList.add('hidden');
  };

  const closeAllActionMenus = () => {
    document.querySelectorAll('[data-action-menu]').forEach((menu) => {
      menu.classList.add('hidden');
      menu.style.removeProperty('left');
      menu.style.removeProperty('top');
    });
  };

  const positionActionMenu = (menu, toggleButton) => {
    menu.classList.remove('hidden');
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';

    const toggleRect = toggleButton.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = toggleRect.right - menuRect.width;
    if (left < margin) {
      left = margin;
    }
    if (left + menuRect.width > viewportWidth - margin) {
      left = viewportWidth - menuRect.width - margin;
    }

    let top = toggleRect.bottom + margin;
    if (top + menuRect.height > viewportHeight - margin) {
      top = toggleRect.top - menuRect.height - margin;
    }
    if (top < margin) {
      top = margin;
    }

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.visibility = 'visible';
  };

  const closeReceiptModal = () => {
    receiptModal.classList.add('hidden');
    receiptModal.classList.remove('flex');
    document.body.style.overflow = '';
    receiptModalDownload.href = '#';
    receiptModalDownload.removeAttribute('download');
    receiptModalImage.classList.add('hidden');
    receiptModalPdf.classList.add('hidden');
    receiptModalImage.removeAttribute('src');
    receiptModalPdf.removeAttribute('src');
  };

  const openReceiptModal = ({ name, path, type }) => {
    if (!path) {
      return;
    }

    receiptModalName.textContent = name || 'Comprovante';
    receiptModalDownload.href = path;
    receiptModalDownload.setAttribute('download', name || 'comprovante');
    const normalizedType = String(type || '').toLowerCase();
    const isPdf = normalizedType === 'application/pdf' || /\.pdf$/i.test(path);

    if (isPdf) {
      receiptModalPdf.src = path;
      receiptModalPdf.classList.remove('hidden');
      receiptModalImage.classList.add('hidden');
      receiptModalImage.removeAttribute('src');
    } else {
      receiptModalImage.src = path;
      receiptModalImage.classList.remove('hidden');
      receiptModalPdf.classList.add('hidden');
      receiptModalPdf.removeAttribute('src');
    }

    receiptModal.classList.remove('hidden');
    receiptModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  };

  const askForConfirmation = ({ title, message, confirmLabel = 'Confirmar' }) => new Promise((resolve) => {
    if (confirmResolver) {
      confirmResolver(false);
      confirmResolver = null;
    }

    confirmTitleNode.textContent = title;
    confirmMessageNode.textContent = message;
    confirmAcceptButton.textContent = confirmLabel;
    confirmModal.classList.remove('hidden');
    confirmModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    confirmResolver = resolve;
    confirmAcceptButton.focus();
  });

  const closeConfirmation = (accepted) => {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
    document.body.style.overflow = '';
    if (confirmResolver) {
      confirmResolver(Boolean(accepted));
      confirmResolver = null;
    }
  };

  const openManualModal = () => {
    manualModal.classList.remove('hidden');
    manualModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    manualErrorNode.classList.add('hidden');
    manualErrorNode.textContent = '';
    manualFields.fullName.focus();
  };

  const closeManualModal = () => {
    manualModal.classList.add('hidden');
    manualModal.classList.remove('flex');
    document.body.style.overflow = '';
    manualForm.reset();
    manualErrorNode.classList.add('hidden');
    manualErrorNode.textContent = '';
    manualReceiptErrorNode.classList.add('hidden');
    manualReceiptErrorNode.textContent = '';
    clearManualReceiptPreview();
  };

  const clearManualReceiptPreview = () => {
    manualReceiptPreview?.classList.add('hidden');
    manualReceiptPreviewImage?.classList.add('hidden');
    manualReceiptPreviewPdf?.classList.add('hidden');

    if (manualReceiptPreviewImage) {
      manualReceiptPreviewImage.removeAttribute('src');
    }
    if (manualReceiptPreviewPdfName) {
      manualReceiptPreviewPdfName.textContent = '';
    }
    if (manualReceiptPreviewPdfFrame) {
      manualReceiptPreviewPdfFrame.removeAttribute('src');
      manualReceiptPreviewPdfFrame.classList.add('hidden');
    }
    if (manualReceiptPreviewMeta) {
      manualReceiptPreviewMeta.textContent = '';
    }

    if (manualPreviewObjectUrl) {
      URL.revokeObjectURL(manualPreviewObjectUrl);
      manualPreviewObjectUrl = null;
    }
  };

  const setManualReceiptError = (message) => {
    if (!message) {
      manualReceiptErrorNode.textContent = '';
      manualReceiptErrorNode.classList.add('hidden');
      return;
    }

    manualReceiptErrorNode.textContent = message;
    manualReceiptErrorNode.classList.remove('hidden');
  };

  const renderManualReceiptPreview = (file) => {
    clearManualReceiptPreview();
    if (!file || !manualReceiptPreview) {
      return;
    }

    manualReceiptPreview.classList.remove('hidden');
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
    manualReceiptPreviewMeta.textContent = `${file.name} - ${fileSizeMb} MB`;

    if (isPdfFile(file)) {
      manualReceiptPreviewPdf.classList.remove('hidden');
      manualReceiptPreviewPdfName.textContent = file.name;
      manualPreviewObjectUrl = URL.createObjectURL(file);
      manualReceiptPreviewPdfFrame.src = manualPreviewObjectUrl;
      manualReceiptPreviewPdfFrame.classList.remove('hidden');
      return;
    }

    if (isSupportedImageFile(file)) {
      manualPreviewObjectUrl = URL.createObjectURL(file);
      manualReceiptPreviewImage.src = manualPreviewObjectUrl;
      manualReceiptPreviewImage.classList.remove('hidden');
    }
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const validateManualForm = () => {
    const fullName = manualFields.fullName.value.trim();
    const phone = manualFields.phone.value.trim();
    const savedAmount = Number(manualFields.savedAmount.value);
    const depositDate = manualFields.depositDate.value;

    if (!fullName || fullName.split(/\s+/).length < 2) {
      return 'Informe nome e sobrenome.';
    }

    if (phone.replace(/\D/g, '').length < 10) {
      return 'Informe um telefone válido.';
    }

    if (Number.isNaN(savedAmount) || savedAmount <= 0) {
      return 'Informe um valor maior que zero.';
    }

    if (!depositDate) {
      return 'Informe a data do depósito.';
    }

    const receiptFile = manualFields.receipt.files && manualFields.receipt.files[0];
    if (!receiptFile) {
      setManualReceiptError('Anexe o comprovante.');
      clearManualReceiptPreview();
      return 'Anexe o comprovante.';
    }

    if (!isPdfFile(receiptFile) && !isSupportedImageFile(receiptFile)) {
      setManualReceiptError('Use PDF ou imagem (JPG, PNG, WEBP).');
      clearManualReceiptPreview();
      return 'Comprovante inválido.';
    }

    if (receiptFile.size > maxFileSizeBytes) {
      setManualReceiptError('Arquivo acima de 5 MB.');
      clearManualReceiptPreview();
      return 'Comprovante inválido.';
    }

    setManualReceiptError('');
    renderManualReceiptPreview(receiptFile);

    return '';
  };

  const render = async () => {
    let submissions = [];
    try {
      submissions = await requestJson(`${apiPath}/submissions`);
    } catch (error) {
      if (error && error.status === 401) {
        setAuthError('Sessão expirada. Entre novamente.');
        showAuthView();
        return;
      }
      emptyNode.classList.remove('hidden');
      cardsWrap.classList.add('hidden');
      tableWrap.classList.add('hidden');
      cardsNode.innerHTML = '';
      rowsNode.innerHTML = '';
      emptyNode.innerHTML = `<p class="text-sm text-red-200">${escapeHtml(error.message)}</p>`;
      return;
    }

    const totalAmount = submissions.reduce((acc, item) => acc + (Number(item.savedAmount) || 0), 0);
    const lastCreated = submissions.length > 0 ? submissions[0].createdAt : null;

    totalCountNode.textContent = String(submissions.length);
    totalAmountNode.textContent = formatCurrency(totalAmount);
    lastCreatedNode.textContent = formatDateTime(lastCreated);

    if (submissions.length === 0) {
      emptyNode.classList.remove('hidden');
      cardsWrap.classList.add('hidden');
      tableWrap.classList.add('hidden');
      cardsNode.innerHTML = '';
      rowsNode.innerHTML = '';
      return;
    }

    emptyNode.classList.add('hidden');
    syncResponsiveDataViews();

    cardsNode.innerHTML = submissions.map((item) => {
      const receipt = item.receipt || {};
      const receiptSummary = receipt.name
        ? `${receipt.name} (${Math.round((Number(receipt.size) || 0) / 1024)} KB)`
        : '-';
      const receiptPreviewAction = receipt.path
        ? `<button type="button" data-path="${escapeHtml(receipt.path)}" data-name="${escapeHtml(receipt.name || '')}" data-type="${escapeHtml(receipt.type || '')}" class="preview-receipt block w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20">Visualizar comprovante</button>`
        : '<span class="block rounded-md px-2 py-1 text-xs text-slate-500">Sem comprovante</span>';
      const whatsappLink = buildWhatsappLink(item);
      const whatsappAction = whatsappLink
        ? `<a href="${escapeHtml(whatsappLink)}" target="_blank" rel="noopener noreferrer" class="block rounded-md px-2 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20">Enviar WhatsApp</a>`
        : '<span class="block rounded-md px-2 py-1 text-xs text-slate-500">WhatsApp indisponivel</span>';

      return `<article class="rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg shadow-black/20">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1 text-sm min-w-0">
            <p class="font-semibold text-slate-100">${escapeHtml(item.fullName)}</p>
            <p class="text-slate-300">${escapeHtml(item.phone)}</p>
            <p class="text-emerald-300 font-semibold">${escapeHtml(formatCurrency(item.savedAmount))}</p>
            <div class="pt-1 space-y-1">
              <p class="text-xs text-slate-400">Depósito: ${escapeHtml(item.depositDate || '-')}</p>
              <p class="text-xs text-slate-400 break-all">Comprovante: ${escapeHtml(receiptSummary)}</p>
            </div>
          </div>
          <div class="relative inline-block text-left">
            <button type="button" data-id="${escapeHtml(item.id)}" class="action-menu-toggle inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-lg font-semibold leading-none text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/50" aria-label="Abrir ações">&#8942;</button>
            <div data-action-menu="${escapeHtml(item.id)}" class="fixed z-30 hidden min-w-56 max-w-[80vw] rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl shadow-black/40">
              ${receiptPreviewAction}
              ${whatsappAction}
              <button type="button" data-id="${escapeHtml(item.id)}" class="delete-row block w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-red-200 transition hover:bg-red-500/20">Excluir inscrição</button>
            </div>
          </div>
        </div>
        <p class="mt-2 text-xs text-slate-500">${escapeHtml(formatDateTime(item.createdAt))}</p>
      </article>`;
    }).join('');

    rowsNode.innerHTML = submissions.map((item, index) => {
      const receipt = item.receipt || {};
      const receiptSummary = receipt.name
        ? `${receipt.name} (${Math.round((Number(receipt.size) || 0) / 1024)} KB)`
        : '-';
      const receiptPreviewAction = receipt.path
        ? `<button type="button" data-path="${escapeHtml(receipt.path)}" data-name="${escapeHtml(receipt.name || '')}" data-type="${escapeHtml(receipt.type || '')}" class="preview-receipt block w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20">Visualizar comprovante</button>`
        : '<span class="block rounded-md px-2 py-1 text-xs text-slate-500">Sem comprovante</span>';
      const whatsappLink = buildWhatsappLink(item);
      const whatsappAction = whatsappLink
        ? `<a href="${escapeHtml(whatsappLink)}" target="_blank" rel="noopener noreferrer" class="block rounded-md px-2 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20">Enviar WhatsApp</a>`
        : '<span class="block rounded-md px-2 py-1 text-xs text-slate-500">WhatsApp indisponivel</span>';

      const rowTone = index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/60';
      return `<tr class="${rowTone} transition hover:bg-zinc-800/70">
        <td class="px-4 py-3.5 align-top text-slate-100">${escapeHtml(formatDateTime(item.createdAt))}</td>
        <td class="px-4 py-3.5 align-top font-semibold text-slate-100">${escapeHtml(item.fullName)}</td>
        <td class="px-4 py-3.5 align-top text-slate-100">${escapeHtml(item.phone)}</td>
        <td class="px-4 py-3.5 align-top text-slate-100">${escapeHtml(formatCurrency(item.savedAmount))}</td>
        <td class="px-4 py-3.5 align-top text-slate-100">${escapeHtml(item.depositDate || '-')}</td>
        <td class="px-4 py-3.5 align-top break-all text-xs text-slate-300">${escapeHtml(receiptSummary)}</td>
        <td class="px-4 py-3.5 text-right align-top">
          <div class="relative inline-block text-left">
            <button type="button" data-id="${escapeHtml(item.id)}" class="action-menu-toggle inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-lg font-semibold leading-none text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/50" aria-label="Abrir ações">&#8942;</button>
            <div data-action-menu="${escapeHtml(item.id)}" class="fixed z-30 hidden min-w-56 max-w-[80vw] rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl shadow-black/40">
              ${receiptPreviewAction}
              ${whatsappAction}
              <button type="button" data-id="${escapeHtml(item.id)}" class="delete-row block w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-red-200 transition hover:bg-red-500/20">Excluir inscrição</button>
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  const handleActionClick = async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const toggleButton = target.closest('.action-menu-toggle');
    if (toggleButton instanceof HTMLElement) {
      const actionContainer = toggleButton.closest('.relative');
      const currentMenu = actionContainer?.querySelector('[data-action-menu]');
      if (!(currentMenu instanceof HTMLElement)) {
        return;
      }

      const isHidden = currentMenu.classList.contains('hidden');
      closeAllActionMenus();
      if (isHidden) {
        positionActionMenu(currentMenu, toggleButton);
      }
      return;
    }

    const deleteButton = target.closest('.delete-row');
    const previewButton = target.closest('.preview-receipt');

    if (previewButton instanceof HTMLElement) {
      openReceiptModal({
        name: previewButton.dataset.name,
        path: previewButton.dataset.path,
        type: previewButton.dataset.type,
      });
      closeAllActionMenus();
      return;
    }

    if (!(deleteButton instanceof HTMLElement)) {
      return;
    }

    const { id } = deleteButton.dataset;
    if (!id) {
      return;
    }

    const confirmed = await askForConfirmation({
      title: 'Excluir inscrição',
      message: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir registro',
    });
    if (!confirmed) {
      return;
    }

    try {
      await requestJson(`${apiPath}/submissions/${id}`, { method: 'DELETE' });
      closeAllActionMenus();
      render();
    } catch (error) {
      if (error && error.status === 401) {
        setAuthError('Sessão expirada. Entre novamente.');
        showAuthView();
        return;
      }
      window.alert(error.message || 'Falha ao excluir inscrição.');
    }
  };

  rowsNode.addEventListener('click', handleActionClick);
  cardsNode.addEventListener('click', handleActionClick);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      closeAllActionMenus();
      return;
    }

    const clickedOnToggle = Boolean(target.closest('.action-menu-toggle'));
    const clickedInsideMenu = Boolean(target.closest('[data-action-menu]'));

    if (!clickedOnToggle && !clickedInsideMenu) {
      closeAllActionMenus();
    }
  });

  window.addEventListener('resize', () => {
    closeAllActionMenus();
    syncResponsiveDataViews();
  });

  window.addEventListener('scroll', () => {
    closeAllActionMenus();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllActionMenus();
      if (!confirmModal.classList.contains('hidden')) {
        closeConfirmation(false);
      }
      if (!receiptModal.classList.contains('hidden')) {
        closeReceiptModal();
      }
      if (!manualModal.classList.contains('hidden')) {
        closeManualModal();
      }
    }
  });

  authForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAuthError('');

    const email = String(authEmail?.value || '').trim();
    const password = String(authPassword?.value || '');
    if (!email || !password) {
      setAuthError('Informe email e senha.');
      return;
    }

    if (authSubmitButton) {
      authSubmitButton.disabled = true;
    }
    try {
      await login(email, password);
      await render();
    } catch (error) {
      setAuthError(error.message || 'Falha no login.');
    } finally {
      if (authSubmitButton) {
        authSubmitButton.disabled = false;
      }
      if (authPassword) {
        authPassword.value = '';
      }
    }
  });

  logoutButton?.addEventListener('click', async () => {
    await logout();
  });

  changeCredentialsButton?.addEventListener('click', () => {
    openCredentialsModal();
  });

  [credentialsCloseButton, credentialsCancelButton].forEach((button) => {
    button?.addEventListener('click', () => {
      closeCredentialsModal();
    });
  });

  credentialsModal?.addEventListener('click', (event) => {
    if (event.target === credentialsModal) {
      closeCredentialsModal();
    }
  });

  credentialsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setCredentialsError('');
    setCredentialsSuccess('');

    const email = String(credentialsEmail?.value || '').trim().toLowerCase();
    const currentPassword = String(credentialsCurrentPassword?.value || '');
    const password = String(credentialsNewPassword?.value || '');
    const confirmPassword = String(credentialsConfirmPassword?.value || '');

    if (!email || !email.includes('@')) {
      setCredentialsError('Informe um email válido.');
      return;
    }
    if (!currentPassword) {
      setCredentialsError('Informe sua senha atual.');
      return;
    }
    if (password.length < 6) {
      setCredentialsError('Nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setCredentialsError('Confirmação de senha não confere.');
      return;
    }

    if (credentialsSubmitButton) {
      credentialsSubmitButton.disabled = true;
    }
    try {
      const result = await requestJson(`${apiPath}/auth/change-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, currentPassword }),
      });
      currentAdminEmail = String(result && result.email || email);
      if (authEmail) {
        authEmail.value = currentAdminEmail;
      }
      setCredentialsSuccess('Acesso atualizado com sucesso.');
      if (credentialsCurrentPassword) {
        credentialsCurrentPassword.value = '';
      }
      if (credentialsNewPassword) {
        credentialsNewPassword.value = '';
      }
      if (credentialsConfirmPassword) {
        credentialsConfirmPassword.value = '';
      }
    } catch (error) {
      if (error && error.status === 401) {
        setAuthError('Sessão expirada. Entre novamente.');
        showAuthView();
        return;
      }
      setCredentialsError(error.message || 'Falha ao atualizar acesso.');
    } finally {
      if (credentialsSubmitButton) {
        credentialsSubmitButton.disabled = false;
      }
    }
  });

  receiptModalCloseButton.addEventListener('click', () => {
    closeReceiptModal();
  });

  receiptModal.addEventListener('click', (event) => {
    if (event.target === receiptModal) {
      closeReceiptModal();
    }
  });

  clearAllButton.addEventListener('click', async () => {
    const confirmed = await askForConfirmation({
      title: 'Limpar todos os dados',
      message: 'Tem certeza que deseja excluir todas as inscrições? Esta ação não pode ser desfeita.',
      confirmLabel: 'Limpar tudo',
    });
    if (!confirmed) {
      return;
    }

    try {
      await requestJson(`${apiPath}/submissions`, { method: 'DELETE' });
      render();
    } catch (error) {
      if (error && error.status === 401) {
        setAuthError('Sessão expirada. Entre novamente.');
        showAuthView();
        return;
      }
      window.alert(error.message || 'Falha ao limpar inscrições.');
    }
  });

  confirmCancelButton.addEventListener('click', () => {
    closeConfirmation(false);
  });

  confirmAcceptButton.addEventListener('click', () => {
    closeConfirmation(true);
  });

  confirmModal.addEventListener('click', (event) => {
    if (event.target === confirmModal) {
      closeConfirmation(false);
    }
  });

  addManualButton.addEventListener('click', () => {
    openManualModal();
  });

  exportCsvButton.addEventListener('click', async () => {
    let items = [];
    try {
      items = await requestJson(`${apiPath}/submissions`);
    } catch (error) {
      if (error && error.status === 401) {
        setAuthError('Sessão expirada. Entre novamente.');
        showAuthView();
        return;
      }
      window.alert(error.message || 'Falha ao exportar CSV.');
      return;
    }

    const separator = ';';
    const headers = [
      'Data de criação',
      'Nome completo',
      'Telefone',
      'Valor poupado (R$)',
      'Data do depósito',
      'Comprovante (nome)',
      'Comprovante (tamanho em bytes)',
      'Comprovante (link)',
      'Origem',
      'Link WhatsApp',
    ];

    const lines = [headers.map(escapeCsv).join(separator)];
    items.forEach((item) => {
      const receipt = item.receipt || {};
      const whatsappLink = buildWhatsappLink(item);
      const receiptLink = toAbsoluteUrl(receipt.path);
      const row = [
        formatDateTime(item.createdAt),
        item.fullName,
        item.phone,
        Number(item.savedAmount) || 0,
        item.depositDate,
        receipt.name,
        receipt.size,
        receiptLink,
        item.source || '',
        whatsappLink,
      ];

      lines.push(row.map(escapeCsv).join(separator));
    });

    downloadFile('inscricoes-parceladao.csv', `\uFEFF${lines.join('\r\n')}`, 'text/csv;charset=utf-8');
  });

  manualFields.phone.addEventListener('input', () => {
    manualFields.phone.value = formatPhone(manualFields.phone.value);
  });

  manualFields.receipt.addEventListener('change', () => {
    const receiptFile = manualFields.receipt.files && manualFields.receipt.files[0];
    if (!receiptFile) {
      setManualReceiptError('');
      clearManualReceiptPreview();
      return;
    }

    if (!isPdfFile(receiptFile) && !isSupportedImageFile(receiptFile)) {
      setManualReceiptError('Use PDF ou imagem (JPG, PNG, WEBP).');
      clearManualReceiptPreview();
      return;
    }

    if (receiptFile.size > maxFileSizeBytes) {
      setManualReceiptError('Arquivo acima de 5 MB.');
      clearManualReceiptPreview();
      return;
    }

    setManualReceiptError('');
    renderManualReceiptPreview(receiptFile);
  });

  [manualCloseButton, manualCancelButton].forEach((button) => {
    button.addEventListener('click', () => {
      closeManualModal();
    });
  });

  manualModal.addEventListener('click', (event) => {
    if (event.target === manualModal) {
      closeManualModal();
    }
  });

  manualForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const validationError = validateManualForm();
    if (validationError) {
      manualErrorNode.textContent = validationError;
      manualErrorNode.classList.remove('hidden');
      return;
    }

    const receiptFile = manualFields.receipt.files[0];

    const formData = new FormData();
    formData.append('fullName', manualFields.fullName.value.trim());
    formData.append('phone', manualFields.phone.value.trim());
    formData.append('savedAmount', String(Number(manualFields.savedAmount.value)));
    formData.append('depositDate', manualFields.depositDate.value);
    formData.append('source', 'admin');
    formData.append('receipt', receiptFile);

    try {
      await requestJson(`${apiPath}/submissions`, {
        method: 'POST',
        body: formData,
      });
      closeManualModal();
      render();
    } catch (error) {
      if (error && error.status === 401) {
        setAuthError('Sessão expirada. Entre novamente.');
        showAuthView();
        return;
      }
      manualErrorNode.textContent = error.message || 'Falha ao salvar inscrição.';
      manualErrorNode.classList.remove('hidden');
    }
  });

  checkSession().then((activeSession) => {
    if (activeSession) {
      render();
    }
  });
})();

