import { getSettings, setSettings } from '@/shared/storage';

function sendAction(type: string, payload?: any) {
	return new Promise<void>((resolve, reject) => {
		chrome.runtime.sendMessage({ __cgptVirt: true, type, payload }, (resp) => {
			const err = chrome.runtime.lastError;
			if (err) return reject(err);
			if (resp && resp.ok) resolve();
			else reject(new Error(resp?.error || 'Unknown error'));
		});
	});
}

function clampInt(n: any, min = 0, max = 1000): number {
	const v = Number.parseInt(String(n), 10);
	if (!Number.isFinite(v) || Number.isNaN(v)) return min;
	return Math.max(min, Math.min(max, v));
}

async function setDynamicHotkeys() {
	// Try MV3 API first; fall back to UA if unavailable
	let isMac = false;
	try {
		if (chrome?.runtime?.getPlatformInfo) {
			const platformInfo = await new Promise<chrome.runtime.PlatformInfo>(
				(resolve) => chrome.runtime.getPlatformInfo(resolve)
			);
			isMac = platformInfo?.os === 'mac';
		} else {
			const plat =
				(navigator as any).userAgentData?.platform ||
				navigator.platform ||
				navigator.userAgent;
			isMac = /Mac|iPhone|iPad|iPod/i.test(plat);
		}
	} catch {
		const plat =
			(navigator as any).userAgentData?.platform ||
			navigator.platform ||
			navigator.userAgent;
		isMac = /Mac|iPhone|iPad|iPod/i.test(plat);
	}

	const expand = document.querySelector<HTMLSpanElement>(
		'.kbd[data-hotkey="expand"]'
	);
	const collapse = document.querySelector<HTMLSpanElement>(
		'.kbd[data-hotkey="collapse"]'
	);

	const mod = isMac ? 'Cmd' : 'Ctrl';
	if (expand) expand.textContent = `${mod}+Shift+9`;
	if (collapse) collapse.textContent = `${mod}+Shift+8`;
}

async function fetchStats(): Promise<{
	total: number;
	visible: number;
	pinned: number;
} | null> {
	try {
		const resp = await new Promise<any>((resolve) => {
			chrome.runtime.sendMessage(
				{ __cgptVirt: true, type: 'virt:getStats' },
				(r) => {
					// Read lastError to avoid console warning and return null safely.
					const err = chrome.runtime.lastError;
					if (err) return resolve(null);
					resolve(r);
				}
			);
		});
		if (resp && resp.ok && resp.stats) {
			return {
				total: Number(resp.stats.total) || 0,
				visible: Number(resp.stats.visible) || 0,
				pinned: Number(resp.stats.pinned) || 0,
			};
		}
	} catch {}
	return null;
}

function renderStatsLine(
	statsEl: HTMLElement | null,
	stats: { total: number; visible: number; pinned: number } | null
) {
	if (!statsEl) return;
	if (!stats) {
		statsEl.textContent = 'Stats not available - see help for details';
		return;
	}
	statsEl.textContent = `Currently visible: ${stats.visible} / ${stats.total} • Pinned: ${stats.pinned}`;
}

async function init() {
	await setDynamicHotkeys();

	// Elements
	const enabled = document.getElementById('enabled') as HTMLInputElement;
	const openShortcuts = document.getElementById(
		'openShortcuts'
	) as HTMLButtonElement;

	const btnExpand = document.getElementById(
		'btnExpand'
	) as HTMLButtonElement | null;
	const btnCollapseOlder = document.getElementById(
		'btnCollapseOlder'
	) as HTMLButtonElement | null;
	const keepN = document.getElementById('keepN') as HTMLInputElement | null;
	const beforeTargetEl = document.getElementById(
		'beforeTarget'
	) as HTMLInputElement | null;
	const btnCollapseBeforeTarget = document.getElementById(
		'btnCollapseBeforeTarget'
	) as HTMLButtonElement | null;
	const btnApplyKeepN = document.getElementById(
		'btnApplyKeepN'
	) as HTMLButtonElement | null;

	// Help dialog elements
	const helpBtn = document.getElementById(
		'openHelp'
	) as HTMLButtonElement | null;
	const helpDialog = document.getElementById(
		'helpDialog'
	) as HTMLDialogElement | null;
	const helpClose = document.getElementById(
		'closeHelp'
	) as HTMLButtonElement | null;
	const statsEl = document.getElementById('statsLine');

	// Open Chrome's shortcuts page
	openShortcuts?.addEventListener('click', (e) => {
		e.preventDefault();
		chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
	});

	// Help dialog handlers
	helpBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		helpDialog?.showModal();
	});

	// ESC/Close button are handled by <dialog> natively. Also close on backdrop click.
	helpDialog?.addEventListener('click', (ev) => {
		if (ev.target === helpDialog) helpDialog.close();
	});

	// Stats update functionality
	const updateStats = async () => {
		// Only try when the tab is enabled; otherwise show dashes.
		const enabledNow = (document.getElementById('enabled') as HTMLInputElement)
			?.checked;
		if (!enabledNow) return renderStatsLine(statsEl!, null);
		const stats = await fetchStats();
		renderStatsLine(statsEl!, stats);
	};

	await updateStats();
	const statsTimer = window.setInterval(updateStats, 1000);
	window.addEventListener('unload', () => window.clearInterval(statsTimer));

	// Hydrate Keep N
	try {
		const s = await getSettings();
		if (keepN) keepN.value = String(s.keepRecent ?? 8);
	} catch {}
	const commitKeepN = async () => {
		if (!keepN) return;
		const n = clampInt(keepN.value, 0, 999);
		keepN.value = String(n);
		try {
			await setSettings({ keepRecent: n });
		} catch {}
	};
	btnApplyKeepN?.addEventListener('click', async () => {
		await commitKeepN(); // persist keepRecent
		await sendAction('virt:collapseAllBut', {
			n: clampInt(keepN?.value ?? 0, 0, 999),
		}); // apply now
	});

	// Query background for this-tab enabled state
	const tabState = await new Promise<{ ok: boolean; enabled?: boolean }>(
		(resolve) => {
			chrome.runtime.sendMessage(
				{ __cgptVirt: true, type: 'virt:getTabEnabled' },
				(resp) => {
					const err = chrome.runtime.lastError;
					if (err) return resolve({ ok: false, enabled: false });
					resolve(resp || { ok: false, enabled: false });
				}
			);
		}
	);
	const isEnabled = !!tabState.enabled;
	enabled.checked = isEnabled;

	// Enable/disable action buttons to reflect tab state
	const setActionsDisabled = (disabled: boolean) => {
		[btnExpand, btnCollapseOlder, beforeTargetEl, btnCollapseBeforeTarget]
			.filter(Boolean)
			.forEach((b) => ((b as HTMLButtonElement).disabled = disabled));
		if (keepN) keepN.disabled = disabled;
	};
	setActionsDisabled(!isEnabled);

	const setAutoCollapseDisabled = (disabled: boolean) => {
		if (keepN) keepN.disabled = disabled;
		if (btnApplyKeepN) btnApplyKeepN.disabled = disabled;
	};
	setAutoCollapseDisabled(!isEnabled);

	// Toggle per-tab enablement (keep popup open)
	enabled.addEventListener('change', async () => {
		await new Promise<void>((resolve, reject) => {
			chrome.runtime.sendMessage(
				{
					__cgptVirt: true,
					type: 'virt:setTabEnabled',
					payload: { enabled: enabled.checked },
				},
				(resp) => {
					const err = chrome.runtime.lastError;
					if (err) return reject(err);
					if (resp && resp.ok) resolve();
					else reject(new Error(resp?.error || 'Unknown error'));
				}
			);
		});
		setActionsDisabled(!enabled.checked);
		setAutoCollapseDisabled(!enabled.checked);
	});

	// Actions
	btnExpand?.addEventListener('click', async () => {
		await sendAction('virt:expandAll');
		window.close();
	});
	btnCollapseOlder?.addEventListener('click', async () => {
		await sendAction('virt:collapseBeforeViewport'); // collapse everything strictly above the first visible turn
		window.close();
	});
	btnCollapseBeforeTarget?.addEventListener('click', async () => {
		const v = (beforeTargetEl?.value || '').trim();
		if (!v) return;
		if (v.startsWith('#') || /^\d+$/.test(v)) {
			const idx = v.startsWith('#')
				? Math.max(0, parseInt(v.slice(1), 10) - 1)
				: Math.max(0, parseInt(v, 10) - 1);
			await sendAction('virt:collapseBefore', { index: idx });
		} else {
			await sendAction('virt:collapseBefore', { id: v });
		}
		window.close();
	});
}

init().catch(console.error);
