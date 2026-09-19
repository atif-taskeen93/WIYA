(() => {
  const STORAGE_KEY = 'wiya-currency';
  const BASE = 'PKR';
  const FALLBACK_RATES = {
    PKR: 1,
    USD: 0.0036,
    EUR: 0.0033,
    GBP: 0.0028,
    SAR: 0.0135,
    AED: 0.0132,
    SGD: 0.0048,
    EGP: 0.175,
    AUD: 0.0054,
    CAD: 0.0049,
  };

  const SYMBOLS = {
    PKR: 'Rs.',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR',
    AED: 'AED',
    SGD: 'S$',
    EGP: 'E£',
    AUD: 'A$',
    CAD: 'C$',
  };

  let activeInstance = null;

  class WiyaCurrency extends HTMLElement {
    constructor() {
      super();
      this.button = this.querySelector('.wiya-currency__button');
      this.label = this.querySelector('[data-wiya-currency-label]');
      this.list = this.querySelector('.wiya-currency__list');
      this.rates = { ...FALLBACK_RATES };
      this.currency = localStorage.getItem(STORAGE_KEY) || BASE;
    }

    connectedCallback() {
      activeInstance = this;
      this.button.addEventListener('click', this.toggle.bind(this));
      this.list.querySelectorAll('[data-currency]').forEach((item) => {
        item.addEventListener('click', () => this.select(item.dataset.currency));
      });
      document.addEventListener('click', (event) => {
        if (!this.contains(event.target)) this.close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.close();
      });
      this.loadRates().finally(() => {
        this.setCurrency(this.currency, false);
        this.convertAll(true);
        this.syncCheckoutNote();
      });
      this.observeDom();
      window.WiyaCurrencyConvert = () => this.convertAll(true);
      window.addEventListener('wiya:currency-refresh', () => this.convertAll(true));
    }

    async loadRates() {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/PKR', {
          cache: 'force-cache',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.rates) {
          this.rates = { PKR: 1, ...data.rates };
        }
      } catch (error) {
        // Keep fallback rates.
      }
    }

    toggle(event) {
      event.stopPropagation();
      const open = this.button.getAttribute('aria-expanded') === 'true';
      open ? this.close() : this.open();
    }

    open() {
      this.button.setAttribute('aria-expanded', 'true');
      this.list.hidden = false;
    }

    close() {
      this.button.setAttribute('aria-expanded', 'false');
      this.list.hidden = true;
    }

    select(code) {
      this.setCurrency(code, true);
      this.close();
      this.convertAll(true);
      this.syncCheckoutNote();
      document.dispatchEvent(
        new CustomEvent('wiya:currency-changed', { detail: { currency: code } })
      );
    }

    setCurrency(code, persist) {
      this.currency = code;
      if (persist) localStorage.setItem(STORAGE_KEY, code);
      this.label.textContent = code;
      this.list.querySelectorAll('[data-currency]').forEach((item) => {
        item.setAttribute('aria-selected', item.dataset.currency === code ? 'true' : 'false');
      });
      document.documentElement.setAttribute('data-wiya-currency', code);
    }

    format(amountCents) {
      const rate = this.rates[this.currency] || FALLBACK_RATES[this.currency] || 1;
      const value = (Number(amountCents) / 100) * rate;
      const symbol = SYMBOLS[this.currency] || this.currency;
      const digits = this.currency === 'PKR' || this.currency === 'JPY' ? 0 : 2;
      const formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      if (this.currency === 'USD' || this.currency === 'GBP' || this.currency === 'EUR' || this.currency === 'AUD' || this.currency === 'CAD') {
        return `${symbol}${formatted}`;
      }
      return `${symbol} ${formatted}`;
    }

    formatPkr(amountCents) {
      const value = Number(amountCents) / 100;
      return `Rs.${value.toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }

    convertAll(force) {
      document.querySelectorAll('[data-wiya-amount]').forEach((el) => {
        const amount = el.getAttribute('data-wiya-amount');
        if (amount === null || amount === '') return;
        if (!force && el.getAttribute('data-wiya-shown') === this.currency) return;
        el.textContent = this.format(amount);
        el.setAttribute('data-wiya-shown', this.currency);
      });
    }

    syncCheckoutNote() {
      document.querySelectorAll('[data-wiya-checkout-note]').forEach((note) => {
        note.hidden = true;
        note.textContent = '';
      });
    }

    observeDom() {
      let scheduled = false;
      const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          this.convertAll(false);
          this.syncCheckoutNote();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  customElements.define('wiya-currency', WiyaCurrency);

  window.WiyaCurrencyConvert = () => {
    if (activeInstance) activeInstance.convertAll(true);
  };
})();
