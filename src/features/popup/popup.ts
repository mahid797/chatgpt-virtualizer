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
	// Prefer Chrome API over UA sniffing for reliability
	const platformInfo = await new Promise<chrome.runtime.PlatformInfo>(
		(resolve) => chrome.runtime.getPlatformInfo(resolve)
	);
	const isMac = platformInfo.os === 'mac';

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

async function init() {
	await setDynamicHotkeys();

	// Elements
	const enabled = document.getElementById('enabled') as HTMLInputElement;
	const openShortcuts = document.getElementById(
		'openShortcuts'
	) as HTMLAnchorElement;

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

	// Open Chrome's shortcuts page
	openShortcuts?.addEventListener('click', (e) => {
		e.preventDefault();
		chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
	});

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
					resolve(resp || { ok: false, enabled: false });
				}
			);
		}
	);
	const isEnabled = !!tabState.enabled;
	enabled.checked = isEnabled;

	// Enable/disable action buttons to reflect tab state
	const setActionsDisabled = (disabled: boolean) => {
		[btnExpand, btnCollapseOlder, btnCollapseBeforeTarget]
			.filter(Boolean)
			.forEach((b) => ((b as HTMLButtonElement).disabled = disabled));
	};
	setActionsDisabled(!isEnabled);

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
