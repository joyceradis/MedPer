export default function installGreeting({auth, root} = {}) {
  let AUTH = auth;

  function getUserDisplayName() {
    try {
      const astate = AUTH?.getState ? AUTH.getState() : (AUTH || {});
      return (
        astate?.user?.name ||
        astate?.profile?.fullName ||
        astate?.profile?.name ||
        astate?.user?.displayName ||
        astate?.name ||
        'NOME DA PESSOA'
      );
    } catch (e) {
      return 'NOME DA PESSOA';
    }
  }

  function getBrasiliaHour() {
    try {
      const parts = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric' }).format(new Date());
      const hour = Number(String(parts).replace(/\D/g, '')) || 0;
      return Math.min(Math.max(hour, 0), 23);
    } catch (e) {
      return new Date().getHours();
    }
  }

  function greetingForHour(hour) {
    if (hour >= 0 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  function greetingText() {
    const name = getUserDisplayName();
    const hour = getBrasiliaHour();
    const salutation = greetingForHour(hour);
    return `${salutation}, Dr. ${name}`;
  }

  function updateGreeting() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    let el = topbar.querySelector('.greeting');
    if (!el) {
      el = document.createElement('span');
      el.className = 'greeting';
      el.style.marginRight = '12px';
      el.style.fontWeight = '600';
      // prefer inserting into a topbar actions container if available
      const actions = topbar.querySelector('.topbar-actions') || topbar.querySelector('.topbar-inner') || topbar;
      actions.insertBefore(el, actions.firstChild);
    }
    el.textContent = greetingText();
  }

  // Initial run and periodic update every minute to keep greeting in sync with Brasília time
  updateGreeting();
  const intervalId = setInterval(updateGreeting, 60 * 1000);

  // Observe DOM mutations to ensure greeting is added after the topbar is rendered
  const observer = new MutationObserver(() => updateGreeting());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return {
    stop() {
      clearInterval(intervalId);
      observer.disconnect();
    }
  };
}
