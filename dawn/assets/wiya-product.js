(() => {
  const root = document.querySelector('[data-wiya-pdp]');
  if (!root) return;

  const stage = root.querySelector('[data-wiya-stage]');
  const thumbs = [...root.querySelectorAll('[data-wiya-thumb]')];
  const prev = root.querySelector('[data-wiya-prev]');
  const next = root.querySelector('[data-wiya-next]');
  const select = root.querySelector('[data-wiya-size]');
  const qtyInput = root.querySelector('[data-wiya-qty]');
  const form = root.querySelector('[data-wiya-pdp-form]');
  const variantInput = root.querySelector('[data-wiya-variant]');
  const priceEls = root.querySelectorAll('[data-wiya-price]');
  const subtotalEl = root.querySelector('[data-wiya-subtotal]');
  const skuEl = root.querySelector('[data-wiya-sku]');
  const addBtns = root.querySelectorAll('[data-wiya-add-btn]');
  const addBtn = addBtns[0];
  const shareBtn = root.querySelector('[data-wiya-share]');
  const zoom = root.querySelector('[data-wiya-zoom]');
  const zoomImg = root.querySelector('[data-wiya-zoom-img]');
  let index = 0;

  const variants = JSON.parse(root.getAttribute('data-variants') || '[]');

  function show(i) {
    if (!thumbs.length) return;
    index = (i + thumbs.length) % thumbs.length;
    const src = thumbs[index].getAttribute('data-full');
    if (stage && src) {
      stage.removeAttribute('srcset');
      stage.removeAttribute('sizes');
      stage.src = src;
    }
    thumbs.forEach((thumb, thumbIndex) => thumb.classList.toggle('is-active', thumbIndex === index));
  }

  thumbs.forEach((thumb, thumbIndex) => {
    thumb.addEventListener('click', () => show(thumbIndex));
    const src = thumb.getAttribute('data-full');
    if (src) {
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = src;
    }
  });
  prev?.addEventListener('click', () => show(index - 1));
  next?.addEventListener('click', () => show(index + 1));
  stage?.addEventListener('click', () => {
    if (!zoom || !zoomImg) return;
    zoomImg.src = stage.src;
    zoom.hidden = false;
  });
  zoom?.addEventListener('click', () => {
    zoom.hidden = true;
  });

  function money(cents) {
    const value = Number(cents || 0) / 100;
    return `Rs.${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function currentVariant() {
    const id = select ? select.value : variantInput?.value;
    return variants.find((item) => String(item.id) === String(id)) || variants[0];
  }

  function sync() {
    const variant = currentVariant();
    if (!variant) return;
    if (variantInput) variantInput.value = variant.id;
    priceEls.forEach((el) => {
      el.textContent = money(variant.price);
      el.setAttribute('data-wiya-amount', variant.price);
    });
    const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));
    if (subtotalEl) {
      subtotalEl.textContent = money(variant.price * qty);
      subtotalEl.setAttribute('data-wiya-amount', variant.price * qty);
    }
    if (skuEl) skuEl.textContent = variant.sku || skuEl.dataset.fallback || '';
    addBtns.forEach((button) => {
      button.disabled = !variant.available;
      if (!button.classList.contains('is-added')) {
        button.textContent = variant.available ? 'Add to cart' : 'Sold out';
      }
    });
    const selectedLabel = select?.selectedOptions?.[0]?.textContent?.trim();
    const live = root.querySelector('[data-wiya-size-live]');
    if (live && selectedLabel) live.textContent = selectedLabel;
    if (typeof window.WiyaCurrencyConvert === 'function') window.WiyaCurrencyConvert();
  }

  select?.addEventListener('change', sync);
  qtyInput?.addEventListener('input', sync);
  root.querySelectorAll('[data-wiya-qty-btn]').forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.getAttribute('data-wiya-qty-btn'));
      const nextQty = Math.max(1, (parseInt(qtyInput.value || '1', 10) || 1) + delta);
      qtyInput.value = String(nextQty);
      sync();
    });
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const variant = currentVariant();
    if (!variant || !variant.available || !addBtn) return;
    addBtn.disabled = true;
    const formData = new FormData(form);
    formData.set('id', variant.id);
    formData.set('quantity', qtyInput?.value || '1');
    formData.append('sections', 'cart-drawer,cart-icon-bubble');
    formData.append('sections_url', window.location.pathname);
    const config = typeof fetchConfig === 'function' ? fetchConfig('javascript') : {
      method: 'POST',
      headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
    };
    if (config.headers) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];
    }
    config.body = formData;
    fetch(window.routes?.cart_add_url || '/cart/add', config)
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          window.alert(response.description || response.message || 'Could not add to cart');
          return;
        }
        const cart = document.querySelector('cart-drawer');
        cart?.classList.remove('is-empty');
        if (cart && typeof cart.renderContents === 'function' && response.sections && response.sections['cart-drawer']) {
          cart.renderContents({ sections: response.sections });
        } else if (cart && typeof cart.updateCartIcon === 'function') {
          cart.updateCartIcon(response.sections && response.sections['cart-icon-bubble']);
        }
        const label = addBtn.textContent;
        addBtn.textContent = 'Added \u2713';
        addBtn.classList.add('is-added');
        setTimeout(() => {
          addBtn.textContent = label;
          addBtn.classList.remove('is-added');
        }, 1600);
      })
      .catch(() => window.alert('Could not add to cart. Please try again.'))
      .finally(() => {
        addBtn.disabled = false;
        sync();
      });
  });

  shareBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareBtn.textContent = 'Link copied';
      setTimeout(() => {
        shareBtn.textContent = 'Share';
      }, 1400);
    } catch (error) {
      window.prompt('Copy product link', window.location.href);
    }
  });

  sync();
})();
