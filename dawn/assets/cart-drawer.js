class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.refreshFromServer().then(() => this.open(cartLink));
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.refreshFromServer().then(() => this.open(cartLink));
      }
    });
  }

  refreshFromServer() {
    const root = window.Shopify?.routes?.root || '/';
    return fetch(`${root}?sections=cart-drawer,cart-icon-bubble`)
      .then((response) => response.json())
      .then((sections) => this.renderContents({ sections }))
      .catch((error) => console.error(error));
  }

  updateCartIcon(sectionHtml) {
    const icon = document.getElementById('cart-icon-bubble');
    if (!icon) return Promise.resolve();

    if (sectionHtml) {
      const parsed = new DOMParser().parseFromString(sectionHtml, 'text/html');
      const fresh = parsed.querySelector('#cart-icon-bubble') || parsed.querySelector('.shopify-section');
      if (fresh) {
        icon.innerHTML = fresh.innerHTML;
        return Promise.resolve();
      }
    }

    return this.refreshCartCount();
  }

  refreshCartCount() {
    const root = window.Shopify?.routes?.root || '/';
    return fetch(`${root}cart.js`)
      .then((response) => response.json())
      .then((cart) => {
        const icon = document.getElementById('cart-icon-bubble');
        if (!icon || !cart) return cart;

        let bubble = icon.querySelector('.cart-count-bubble');
        if (cart.item_count > 0) {
          if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = 'cart-count-bubble';
            bubble.innerHTML =
              '<span aria-hidden="true"></span><span class="visually-hidden">Items in cart</span>';
            icon.appendChild(bubble);
          }
          const num = bubble.querySelector('[aria-hidden="true"]');
          if (num) num.textContent = cart.item_count < 100 ? String(cart.item_count) : '';
        } else if (bubble) {
          bubble.remove();
        }
        return cart;
      })
      .catch((error) => console.error(error));
  }

  open(triggeredBy) {
    if (this.classList.contains('active')) return;
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true },
    );

    document.body.classList.add('overflow-hidden');

    // cart-drawer-items is a CartItems subclass that extends createViewEventElement.
    // Its `view-event-trigger="manual"` skips auto-dispatch on connect; we fire
    // it here when the drawer opens, with `context: 'dialog'` from the payload attribute.
    this.querySelector('cart-drawer-items')?.dispatchViewEvent();
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    if (!parsedState?.sections) return;
    this.classList.remove('is-empty');
    const inner = this.querySelector('.drawer__inner');
    if (inner) inner.classList.remove('is-empty');

    const drawerHtml = parsedState.sections['cart-drawer'];
    if (drawerHtml && inner) {
      const freshInner = this.getSectionDOM(drawerHtml, '.drawer__inner');
      if (freshInner) inner.innerHTML = freshInner.innerHTML;
    }

    this.updateCartIcon(parsedState.sections['cart-icon-bubble']);
    this.querySelector('cart-drawer-items')?.classList.remove('is-empty');
    this.querySelector('#CartDrawer-Overlay')?.addEventListener('click', this.close.bind(this));
    if (typeof window.WiyaCurrencyConvert === 'function') window.WiyaCurrencyConvert();
    document.dispatchEvent(new CustomEvent('wiya:currency-refresh'));
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
