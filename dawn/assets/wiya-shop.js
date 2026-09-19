(() => {
  const root = document.querySelector('[data-wiya-store]');
  if (!root) return;

  function sizeLabel(title) {
    switch (title) {
      case 'XS':
        return '6 (XS)';
      case 'S':
        return '8 (S)';
      case 'M':
        return '10 (M)';
      case 'L':
        return '12 (L)';
      case 'XL':
        return '14 (XL)';
      default:
        return title;
    }
  }

  function closeAll(except) {
    root.querySelectorAll('[data-wiya-media].is-open').forEach((media) => {
      if (media !== except) media.classList.remove('is-open');
    });
  }

  function syncHeaderCart(sections) {
    const cart = document.querySelector('cart-drawer');
    if (cart) cart.classList.remove('is-empty');
    if (cart && typeof cart.renderContents === 'function' && sections && sections['cart-drawer']) {
      cart.renderContents({ sections });
      return;
    }
    if (cart && typeof cart.updateCartIcon === 'function') {
      cart.updateCartIcon(sections && sections['cart-icon-bubble']);
      return;
    }
    fetch(`${window.Shopify?.routes?.root || '/'}cart.js`)
      .then((response) => response.json())
      .then((cartData) => {
        const icon = document.getElementById('cart-icon-bubble');
        if (!icon || !cartData) return;
        let bubble = icon.querySelector('.cart-count-bubble');
        if (cartData.item_count > 0) {
          if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = 'cart-count-bubble';
            bubble.innerHTML =
              '<span aria-hidden="true"></span><span class="visually-hidden">Items in cart</span>';
            icon.appendChild(bubble);
          }
          const num = bubble.querySelector('[aria-hidden="true"]');
          if (num) num.textContent = cartData.item_count < 100 ? String(cartData.item_count) : '';
        } else if (bubble) {
          bubble.remove();
        }
      })
      .catch((error) => console.error(error));
  }

  root.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-wiya-quick]');
    if (opener) {
      event.preventDefault();
      event.stopPropagation();
      const media = opener.closest('[data-wiya-media]');
      closeAll(media);
      media?.classList.add('is-open');
      return;
    }

    const closer = event.target.closest('[data-wiya-close]');
    if (closer) {
      event.preventDefault();
      closer.closest('[data-wiya-media]')?.classList.remove('is-open');
      return;
    }

    const chip = event.target.closest('[data-wiya-chip]');
    if (chip) {
      event.preventDefault();
      const form = chip.closest('form');
      if (!form || chip.disabled) return;
      form.querySelectorAll('[data-wiya-chip]').forEach((item) => item.classList.remove('is-active'));
      chip.classList.add('is-active');
      const idInput = form.querySelector('[name="id"]');
      if (idInput) idInput.value = chip.getAttribute('data-variant-id');
      const live = form.querySelector('[data-wiya-size-live]');
      if (live) live.textContent = chip.getAttribute('data-label') || sizeLabel(chip.textContent.trim());
      const addBtn = form.querySelector('[data-wiya-add-btn]');
      const available = chip.getAttribute('data-available') === 'true';
      if (addBtn) {
        addBtn.disabled = !available;
        addBtn.textContent = available ? 'Add to bag' : 'Sold out';
      }
      return;
    }

    const qtyBtn = event.target.closest('[data-wiya-qty]');
    if (qtyBtn) {
      event.preventDefault();
      const form = qtyBtn.closest('form');
      const input = form?.querySelector('[name="quantity"]');
      if (!input) return;
      const next = Math.max(1, (parseInt(input.value || '1', 10) || 1) + Number(qtyBtn.getAttribute('data-wiya-qty')));
      input.value = String(next);
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-wiya-media]')) closeAll();
  });

  root.querySelectorAll('form[data-wiya-add="true"]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('[data-wiya-add-btn]');
      if (!button || button.disabled) return;
      button.disabled = true;

      const formData = new FormData(form);
      formData.append('sections', 'cart-drawer,cart-icon-bubble');
      formData.append('sections_url', window.location.pathname);

      const config =
        typeof fetchConfig === 'function'
          ? fetchConfig('javascript')
          : {
              method: 'POST',
              headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
            };
      if (config.headers) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];
      }
      config.body = formData;

      fetch(window.routes?.cart_add_url || '/cart/add.js', config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            window.alert(response.description || response.message || 'Could not add to cart');
            return;
          }
          syncHeaderCart(response.sections);
          form.closest('[data-wiya-media]')?.classList.remove('is-open');
          const label = button.textContent;
          button.textContent = 'Added';
          setTimeout(() => {
            button.textContent = label;
          }, 1400);
        })
        .catch((error) => {
          console.error(error);
          window.alert('Could not add to cart. Please try again.');
        })
        .finally(() => {
          button.disabled = false;
        });
    });
  });
})();
