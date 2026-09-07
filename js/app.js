const form = document.getElementById('registration-form');

if (form) {
  const fields = {
	fullName: document.getElementById('fullName'),
	phone: document.getElementById('phone'),
	savedAmount: document.getElementById('savedAmount'),
	depositDate: document.getElementById('depositDate'),
	receipt: document.getElementById('receipt'),
  };

  const progressBar = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const submitButton = document.getElementById('submit-button');
  const submitText = document.getElementById('submit-text');
  const statusMessage = document.getElementById('form-status');

  const previewContainer = document.getElementById('receipt-preview');
  const previewImage = document.getElementById('receipt-preview-image');
  const previewPdf = document.getElementById('receipt-preview-pdf');
  const previewPdfName = document.getElementById('receipt-preview-pdf-name');
  const previewPdfFrame = document.getElementById('receipt-preview-pdf-frame');
  const previewMeta = document.getElementById('receipt-preview-meta');

  const maxFileSizeBytes = 5 * 1024 * 1024;
  const draftKey = 'parceladao-hidra-draft-v1';
  const apiPath = '/api';
  let previewObjectUrl = null;

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

  const getErrorNode = (fieldName) => document.getElementById(`${fieldName}-error`);

  const showError = (fieldName, message) => {
	const errorNode = getErrorNode(fieldName);
	if (!errorNode) {
	  return;
	}

	errorNode.textContent = message;
	errorNode.classList.remove('hidden');
	fields[fieldName]?.setAttribute('aria-invalid', 'true');
  };

  const clearError = (fieldName) => {
	const errorNode = getErrorNode(fieldName);
	if (!errorNode) {
	  return;
	}

	errorNode.textContent = '';
	errorNode.classList.add('hidden');
	fields[fieldName]?.removeAttribute('aria-invalid');
  };

  const formatPhone = (value) => {
	const digits = value.replace(/\D/g, '').slice(0, 11);

	if (digits.length <= 2) {
	  return digits;
	}

	if (digits.length <= 6) {
	  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	}

	if (digits.length <= 10) {
	  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	}

	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const isValidPhone = (value) => value.replace(/\D/g, '').length === 11;

  const clearPreview = () => {
	previewContainer?.classList.add('hidden');
	previewImage?.classList.add('hidden');
	previewPdf?.classList.add('hidden');
	if (previewImage) {
	  previewImage.removeAttribute('src');
	}
	if (previewPdfName) {
	  previewPdfName.textContent = '';
	}
	if (previewPdfFrame) {
	  previewPdfFrame.removeAttribute('src');
	  previewPdfFrame.classList.add('hidden');
	}
	if (previewMeta) {
	  previewMeta.textContent = '';
	}
	if (previewObjectUrl) {
	  URL.revokeObjectURL(previewObjectUrl);
	  previewObjectUrl = null;
	}
  };

  const renderReceiptPreview = (file) => {
	if (!file || !previewContainer) {
	  clearPreview();
	  return;
	}

	clearPreview();
	previewContainer.classList.remove('hidden');

	const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
	if (previewMeta) {
	  previewMeta.textContent = `${file.name} - ${fileSizeMb} MB`;
	}

	if (isPdfFile(file)) {
	  previewPdf?.classList.remove('hidden');
	  if (previewPdfName) {
		previewPdfName.textContent = file.name;
	  }

	  previewObjectUrl = URL.createObjectURL(file);
	  if (previewPdfFrame) {
		previewPdfFrame.src = previewObjectUrl;
		previewPdfFrame.classList.remove('hidden');
	  }

	  return;
	}

	if (isSupportedImageFile(file)) {
	  previewObjectUrl = URL.createObjectURL(file);
	  if (previewImage) {
		previewImage.src = previewObjectUrl;
		previewImage.classList.remove('hidden');
	  }
	}
  };

  const saveDraft = () => {
	const receiptFile = fields.receipt.files && fields.receipt.files[0];
	const draft = {
	  fullName: fields.fullName.value,
	  phone: fields.phone.value,
	  savedAmount: fields.savedAmount.value,
	  depositDate: fields.depositDate.value,
	  receiptName: receiptFile ? receiptFile.name : '',
	  updatedAt: Date.now(),
	};

	try {
	  localStorage.setItem(draftKey, JSON.stringify(draft));
	} catch (error) {
	  console.warn('Não foi possível salvar rascunho no localStorage:', error);
	}
  };

  const loadDraft = () => {
	try {
	  const rawDraft = localStorage.getItem(draftKey);
	  if (!rawDraft) {
		return;
	  }

	  const draft = JSON.parse(rawDraft);
	  fields.fullName.value = draft.fullName || '';
	  fields.phone.value = draft.phone || '';
	  fields.savedAmount.value = draft.savedAmount || '';
	  fields.depositDate.value = draft.depositDate || '';

	  if (draft.receiptName && previewContainer && previewMeta && previewPdf && previewPdfName) {
		previewContainer.classList.remove('hidden');
		previewPdf.classList.remove('hidden');
		previewPdfName.textContent = draft.receiptName;
		previewMeta.textContent = `${draft.receiptName} - selecione novamente para anexar`;
		previewPdfFrame?.classList.add('hidden');
	  }
	} catch (error) {
	  console.warn('Não foi possível restaurar rascunho do localStorage:', error);
	}
  };

  const clearDraft = () => {
	try {
	  localStorage.removeItem(draftKey);
	} catch (error) {
	  console.warn('Não foi possível remover rascunho do localStorage:', error);
	}
  };

  const validateField = (fieldName) => {
	const field = fields[fieldName];
	if (!field) {
	  return true;
	}

	if (fieldName === 'fullName') {
	  const name = field.value.trim();
	  if (!name) {
		showError(fieldName, 'Informe seu nome completo.');
		return false;
	  }
	  if (name.split(/\s+/).length < 2) {
		showError(fieldName, 'Digite nome e sobrenome.');
		return false;
	  }
	  clearError(fieldName);
	  return true;
	}

	if (fieldName === 'phone') {
	  if (!field.value.trim()) {
		showError(fieldName, 'Informe seu número de telefone.');
		return false;
	  }
	  if (!isValidPhone(field.value)) {
		showError(fieldName, 'Use o formato com 11 dígitos, ex: (41) 99999-9999.');
		return false;
	  }
	  clearError(fieldName);
	  return true;
	}

	if (fieldName === 'savedAmount') {
	  const amount = Number(field.value);
	  if (!field.value) {
		showError(fieldName, 'Informe o valor poupado.');
		return false;
	  }
	  if (Number.isNaN(amount) || amount <= 0) {
		showError(fieldName, 'Digite um valor maior que zero.');
		return false;
	  }
	  clearError(fieldName);
	  return true;
	}

	if (fieldName === 'depositDate') {
	  if (!field.value) {
		showError(fieldName, 'Selecione a data do depósito.');
		return false;
	  }
	  clearError(fieldName);
	  return true;
	}

	if (fieldName === 'receipt') {
	  const file = field.files && field.files[0];
	  if (!file) {
		showError(fieldName, 'Anexe o comprovante.');
		clearPreview();
		return false;
	  }

	  if (!isPdfFile(file) && !isSupportedImageFile(file)) {
		showError(fieldName, 'Use PDF ou imagem (JPG, PNG, WEBP).');
		clearPreview();
		return false;
	  }

	  if (file.size > maxFileSizeBytes) {
		showError(fieldName, 'Arquivo acima de 5 MB.');
		clearPreview();
		return false;
	  }

	  clearError(fieldName);
	  renderReceiptPreview(file);
	  return true;
	}

	return true;
  };

  const updateProgress = () => {
	const checks = {
	  fullName: fields.fullName.value.trim().split(/\s+/).length >= 2,
	  phone: isValidPhone(fields.phone.value),
	  savedAmount: Number(fields.savedAmount.value) > 0,
	  depositDate: Boolean(fields.depositDate.value),
	  receipt: Boolean(fields.receipt.files && fields.receipt.files[0]),
	};

	const filledCount = Object.values(checks).filter(Boolean).length;
	const totalCount = Object.keys(checks).length;
	const percentage = Math.round((filledCount / totalCount) * 100);

	progressBar.style.width = `${percentage}%`;
	progressLabel.textContent = `${percentage}%`;
  };

  const setStatus = (type, text) => {
	statusMessage.classList.remove('hidden', 'bg-emerald-500/20', 'text-emerald-200', 'bg-red-500/20', 'text-red-200');
	statusMessage.textContent = text;

	if (type === 'success') {
	  statusMessage.classList.add('bg-emerald-500/20', 'text-emerald-200');
	  return;
	}

	statusMessage.classList.add('bg-red-500/20', 'text-red-200');
  };

  fields.phone.addEventListener('input', () => {
	fields.phone.value = formatPhone(fields.phone.value);
	validateField('phone');
	updateProgress();
	saveDraft();
  });

  Object.keys(fields).forEach((fieldName) => {
	if (fieldName === 'phone') {
	  return;
	}

	const field = fields[fieldName];
	const eventName = fieldName === 'receipt' ? 'change' : 'input';

	field.addEventListener(eventName, () => {
	  validateField(fieldName);
	  updateProgress();
	  saveDraft();
	});

	field.addEventListener('blur', () => {
	  validateField(fieldName);
	});
  });

  form.addEventListener('submit', async (event) => {
	event.preventDefault();

	const isValid = Object.keys(fields).every((fieldName) => validateField(fieldName));
	updateProgress();

	if (!isValid) {
	  setStatus('error', 'Revise os campos obrigatórios antes de enviar.');
	  return;
	}

	submitButton.disabled = true;
	submitText.textContent = 'Enviando...';
	setStatus('success', 'Processando sua inscrição...');

	try {
	  const payload = {
		fullName: fields.fullName.value.trim(),
		phone: fields.phone.value,
		savedAmount: Number(fields.savedAmount.value),
		depositDate: fields.depositDate.value,
		receiptFileName: fields.receipt.files[0].name,
	  };

	  const formData = new FormData();
	  formData.append('fullName', payload.fullName);
	  formData.append('phone', payload.phone);
	  formData.append('savedAmount', String(payload.savedAmount));
	  formData.append('depositDate', payload.depositDate);
	  formData.append('source', 'form');
	  formData.append('receipt', fields.receipt.files[0]);

	  const response = await fetch(`${apiPath}/submissions`, {
		method: 'POST',
		body: formData,
	  });

	  if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: 'Falha ao enviar inscrição.' }));
		throw new Error(errorData.error || 'Falha ao enviar inscrição.');
	  }

	  const created = await response.json();
	  console.log('Payload de inscrição enviado para API:', created);

	  submitButton.disabled = false;
	  submitText.textContent = 'Enviar inscrição';
	  setStatus('success', 'Inscrição enviada com sucesso! Entraremos em contato.');
	  clearDraft();
	  form.reset();
	  clearPreview();
	  updateProgress();
	} catch (error) {
	  submitButton.disabled = false;
	  submitText.textContent = 'Enviar inscrição';
	  setStatus('error', error.message || 'Falha ao enviar inscrição.');
	}
  });

  loadDraft();
  updateProgress();

  window.addEventListener('beforeunload', () => {
	saveDraft();
	if (previewObjectUrl) {
	  URL.revokeObjectURL(previewObjectUrl);
	}
  });
}

