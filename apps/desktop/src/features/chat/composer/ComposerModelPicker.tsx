import { composerModelDisplayName, sameComposerModelId } from "../../../lib/composer-models";
import { providerDisplayName } from "../../../lib/provider-display";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { ComposerModelList } from "./ComposerModelList";
import { AnchoredMenu } from "../../../components/settings/AnchoredMenu";
import {
  IconBot,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "../../../components/icons";
import { TooltipButton } from "../../../components/ui";
import type { useComposerModelMenu } from "./hooks/useComposerModelMenu";
import { ThinkingLevelSlider } from "./ThinkingLevelSlider";

type ModelMenuController = ReturnType<typeof useComposerModelMenu>;

export type ComposerModelPickerProps = {
  t: TFunction;
  controller: ModelMenuController;
  modelLabel: string;
  thinkingLabel: string;
  thinkingLevel: string;
  selectedProviderId?: string;
  selectedModelId?: string;
  controlsBlocked: boolean;
  onCloseOtherMenus: () => void;
  rootActions?: ReactNode;
};

/** Model/reasoning picker with its keyboard and focus contract intact. */
export function ComposerModelPicker({
  t,
  controller,
  modelLabel,
  thinkingLabel,
  thinkingLevel,
  selectedProviderId,
  selectedModelId,
  controlsBlocked,
  onCloseOtherMenus,
  rootActions,
}: ComposerModelPickerProps) {
  const {
    open,
    setOpen,
    view,
    query,
    setQuery,
    modelHighlight,
    setModelHighlight,
    rootMenuRef,
    modelSearchRef,
    modelListRef,
    modelGroups,
    recentEntries,
    thinkingMenuLevels,
    showView,
    selectModel,
    commitThinkingLevel,
    onMenuKeyDown,
  } = controller;

  return (
    <AnchoredMenu
      className="composer-model-thinking"
      open={open}
      onClose={() => setOpen(false)}
      menuClassName="composer-model-menu composer-model-thinking-menu"
      label={`${t("chat.model")} ${t("chat.reasoningLevel")}`}
      role="menu"
      align="end"
      side="top"
      initialFocus="none"
      onMenuKeyDown={onMenuKeyDown}
      trigger={(ref) => (
        <TooltipButton
          ref={ref}
          type="button"
          className={`icon-btn composer-model-thinking-chip ${open ? "active" : ""}`}
          tooltip={`${modelLabel} · ${t("chat.reasoningLevel")}: ${thinkingLabel}`}
          ariaLabel={`${t("chat.model")}: ${modelLabel}. ${t("chat.reasoningLevel")}: ${thinkingLabel}`}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={controlsBlocked}
          onClick={() => {
            onCloseOtherMenus();
            if (!open) {
              showView("root");
              setQuery("");
              setModelHighlight(-1);
            }
            setOpen((current) => !current);
          }}
        >
          <span className="composer-model-thinking-icon" aria-hidden="true">
            <IconBot size={14} />
          </span>
          <span className="composer-model-thinking-model">{modelLabel}</span>
          {thinkingLevel !== "off" ? (
            <>
              <span className="composer-model-thinking-dot" aria-hidden="true">·</span>
              <span className="composer-model-thinking-level">{thinkingLabel}</span>
            </>
          ) : null}
          <IconChevronDown size={12} aria-hidden="true" className="composer-model-thinking-chevron" />
        </TooltipButton>
      )}
    >
      {view === "root" ? (
        <div className="composer-menu-root" ref={rootMenuRef}>
          {rootActions}
          {recentEntries.length > 0 ? (
            <div role="group" aria-label={t("chat.recentModels")}>
              <div className="composer-model-group-label">{t("chat.recentModels")}</div>
              {recentEntries.map(({ provider, model }) => (
                <button
                  key={`${provider.id}:${model.modelId}`}
                  type="button"
                  className="composer-menu-entry"
                  role="menuitemradio"
                  aria-checked={provider.id === selectedProviderId && sameComposerModelId(model.modelId, selectedModelId ?? "")}
                  title={`${providerDisplayName(provider)} · ${model.modelId}`}
                  onClick={() => void selectModel(provider, model.modelId)}
                >
                  <span className="composer-menu-entry-label">{composerModelDisplayName(provider, model.modelId)}</span>
                  <span className="composer-menu-entry-value">{providerDisplayName(provider)}</span>
                  {provider.id === selectedProviderId && sameComposerModelId(model.modelId, selectedModelId ?? "") ? (
                    <IconCheck size={14} aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="composer-menu-entry"
            role="menuitem"
            aria-haspopup="menu"
            onClick={() => showView("model")}
          >
            <IconBot size={14} aria-hidden="true" />
            <span className="composer-menu-entry-label">{t("chat.allModels")}</span>
            <span className="composer-menu-entry-value" title={modelLabel}>{modelLabel}</span>
            <IconChevronRight size={14} aria-hidden="true" />
          </button>
          {/* The level is one drag away on the slider below (issue #417): the
              menu has no separate reasoning view left to open. */}
          {thinkingMenuLevels.length > 1 ? (
            <ThinkingLevelSlider
              key={`${selectedProviderId}:${selectedModelId}:${thinkingMenuLevels.join("|")}`}
              levels={thinkingMenuLevels}
              level={thinkingLevel}
              label={t("chat.reasoningLevel")}
              commit={commitThinkingLevel}
            />
          ) : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="composer-menu-back"
            role="menuitem"
            onClick={() => showView("root")}
          >
            <IconChevronLeft size={14} aria-hidden="true" />
            <span>{t("chat.model")}</span>
          </button>
          <div className="composer-menu-separator" />
          <ComposerModelList
            t={t} query={query} setQuery={setQuery}
            modelSearchRef={modelSearchRef} modelListRef={modelListRef}
            modelGroups={modelGroups} modelHighlight={modelHighlight}
            setModelHighlight={setModelHighlight} selectModel={selectModel}
            selectedProviderId={selectedProviderId} selectedModelId={selectedModelId}
          />
        </>
      )}
    </AnchoredMenu>
  );
}
