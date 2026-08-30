import { ColorPicker, parseColor } from '@ark-ui/react/color-picker'
import { Menu } from '@ark-ui/react/menu'
import { NumberInput } from '@ark-ui/react/number-input'
import { SegmentGroup } from '@ark-ui/react/segment-group'
import { Slider } from '@ark-ui/react/slider'
import type { CaptionSettings } from '@vplayer/core'
import { useState, type FC, type ReactNode } from 'react'

import { usePlayerContext, usePlayerRemote, usePlayerState } from '../context'
import { Icon } from '../icon'

interface RangeSettingProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: ReactNode
  onChange: (value: number) => void
}

function RangeSetting({ label, value, min, max, step, display, onChange }: RangeSettingProps) {
  return (
    <Slider.Root
      className="vplayer__caption-control"
      value={[value]}
      min={min}
      max={max}
      step={step}
      aria-label={[label]}
      onValueChange={(details) => onChange(details.value[0])}
    >
      <Slider.Label className="vplayer__caption-control-label">{label}</Slider.Label>
      <Slider.ValueText className="vplayer__caption-control-value">{display}</Slider.ValueText>
      <Slider.Control className="vplayer__caption-slider-control">
        <Slider.Track className="vplayer__caption-slider-track">
          <Slider.Range className="vplayer__caption-slider-range" />
        </Slider.Track>
        <Slider.Thumb index={0} className="vplayer__caption-slider-thumb">
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
  )
}

interface Choice<T extends string> {
  value: T
  label: string
}

interface ChoiceSettingProps<T extends string> {
  label: string
  value: T
  choices: readonly Choice<T>[]
  onChange: (value: T) => void
}

function ChoiceSetting<T extends string>({ label, value, choices, onChange }: ChoiceSettingProps<T>) {
  return (
    <SegmentGroup.Root
      className="vplayer__caption-choice"
      value={value}
      onValueChange={(details) => details.value && onChange(details.value as T)}
    >
      <SegmentGroup.Label>{label}</SegmentGroup.Label>
      <div className="vplayer__caption-choice-items">
        {choices.map((choice) => (
          <SegmentGroup.Item key={choice.value} value={choice.value} className="vplayer__caption-choice-item">
            <SegmentGroup.ItemHiddenInput />
            <SegmentGroup.ItemControl />
            <SegmentGroup.ItemText>{choice.label}</SegmentGroup.ItemText>
          </SegmentGroup.Item>
        ))}
      </div>
    </SegmentGroup.Root>
  )
}

const FONT_STACK: Record<CaptionSettings['fontFamily'], string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, Cambria, serif',
  monospace: 'ui-monospace, SFMono-Regular, monospace',
}

export const CaptionSettingsPanel: FC<{ onBack: () => void }> = ({ onBack }) => {
  const { labels, icons } = usePlayerContext()
  const remote = usePlayerRemote()
  const settings = usePlayerState('captionSettings')
  const [colorTarget, setColorTarget] = useState<'textColor' | 'backgroundColor' | 'edgeColor'>('textColor')
  const selectedColor = settings[colorTarget]
  const previewEdge =
    settings.edgeStyle === 'outline'
      ? `-1px -1px 0 ${settings.edgeColor}, 1px -1px 0 ${settings.edgeColor}, -1px 1px 0 ${settings.edgeColor}, 1px 1px 0 ${settings.edgeColor}`
      : settings.edgeStyle === 'shadow'
        ? `0 2px 3px ${settings.edgeColor}`
        : 'none'

  return (
    <div className="vplayer__caption-panel">
      <div className="vplayer__caption-panel-header">
        <button
          type="button"
          className="vplayer__caption-back"
          onClick={onBack}
          aria-label={`Back to ${labels.subtitles}`}
        >
          <Icon icon={icons.chevronLeft} width={14} className="vplayer__menu-icon" />
          <span>{labels.captionAppearance}</span>
        </button>
        <button type="button" className="vplayer__caption-reset" onClick={remote.resetCaptionSettings}>
          {labels.captionReset}
        </button>
      </div>
      <Menu.Separator className="vplayer__menu-separator" />

      <div
        className="vplayer__caption-preview"
        style={{
          color: `color-mix(in srgb, ${settings.textColor} ${Math.round(settings.textOpacity * 100)}%, transparent)`,
          background: `color-mix(in srgb, ${settings.backgroundColor} ${Math.round(settings.backgroundOpacity * 100)}%, transparent)`,
          fontFamily: FONT_STACK[settings.fontFamily],
          fontSize: `${settings.fontScale / 100}rem`,
          lineHeight: settings.lineHeight,
          textShadow: previewEdge,
        }}
      >
        {labels.captionPreview}
      </div>

      <section className="vplayer__caption-section" aria-label="Timing and position">
        <h3>Timing &amp; position</h3>
        <NumberInput.Root
          className="vplayer__caption-delay-stepper"
          value={settings.delay.toFixed(1)}
          min={-10}
          max={10}
          step={0.1}
          spinOnPress={false}
          onValueChange={(details) => {
            if (Number.isFinite(details.valueAsNumber)) remote.setCaptionSettings({ delay: details.valueAsNumber })
          }}
        >
          <NumberInput.Label>{labels.captionDelay}</NumberInput.Label>
          <NumberInput.Control>
            <NumberInput.DecrementTrigger aria-label="Decrease subtitle delay">−</NumberInput.DecrementTrigger>
            <NumberInput.Input aria-label={labels.captionDelay} />
            <NumberInput.IncrementTrigger aria-label="Increase subtitle delay">+</NumberInput.IncrementTrigger>
          </NumberInput.Control>
        </NumberInput.Root>
        <RangeSetting
          label={labels.captionPosition}
          value={settings.position}
          min={-20}
          max={30}
          step={1}
          display={`${settings.position > 0 ? '+' : ''}${settings.position}vh`}
          onChange={(position) => remote.setCaptionSettings({ position })}
        />
        <RangeSetting
          label={labels.captionLineHeight}
          value={settings.lineHeight}
          min={1}
          max={2}
          step={0.05}
          display={`${settings.lineHeight.toFixed(2)}×`}
          onChange={(lineHeight) => remote.setCaptionSettings({ lineHeight })}
        />
      </section>

      <section className="vplayer__caption-section" aria-label="Typography">
        <h3>Typography</h3>
        <ChoiceSetting
          label={labels.captionFontFamily}
          value={settings.fontFamily}
          choices={[
            { value: 'sans', label: 'Sans' },
            { value: 'serif', label: 'Serif' },
            { value: 'monospace', label: 'Mono' },
          ]}
          onChange={(fontFamily) => remote.setCaptionSettings({ fontFamily })}
        />
        <ChoiceSetting
          label={labels.captionSize}
          value={settings.fontSize}
          choices={[
            { value: 'small', label: labels.captionSmall },
            { value: 'medium', label: labels.captionMedium },
            { value: 'large', label: labels.captionLarge },
          ]}
          onChange={(fontSize) => remote.setCaptionSettings({ fontSize })}
        />
        <RangeSetting
          label={labels.captionFontScale}
          value={settings.fontScale}
          min={50}
          max={200}
          step={5}
          display={`${settings.fontScale}%`}
          onChange={(fontScale) => remote.setCaptionSettings({ fontScale })}
        />
      </section>
      <section className="vplayer__caption-section" aria-label="Color and effects">
        <h3>Color &amp; effects</h3>
        <ChoiceSetting
          label="Color target"
          value={colorTarget}
          choices={[
            { value: 'textColor', label: 'Text' },
            { value: 'backgroundColor', label: 'Background' },
            { value: 'edgeColor', label: 'Edge' },
          ]}
          onChange={setColorTarget}
        />
        <ColorPicker.Root
          inline
          className="vplayer__caption-color-editor"
          value={parseColor(selectedColor)}
          onValueChange={(details) =>
            remote.setCaptionSettings({ [colorTarget]: details.value.toString('hex') } as Partial<CaptionSettings>)
          }
        >
          <ColorPicker.Label>
            {colorTarget === 'textColor'
              ? labels.captionTextColor
              : colorTarget === 'backgroundColor'
                ? labels.captionBackgroundColor
                : labels.captionEdgeColor}
          </ColorPicker.Label>
          <ColorPicker.Content className="vplayer__caption-color-popover">
            <ColorPicker.Area xChannel="saturation" yChannel="brightness" className="vplayer__caption-color-area">
              <ColorPicker.AreaBackground />
              <ColorPicker.AreaThumb className="vplayer__caption-color-thumb" />
            </ColorPicker.Area>
            <ColorPicker.ChannelSlider channel="hue" className="vplayer__caption-hue-slider">
              <ColorPicker.ChannelSliderTrack />
              <ColorPicker.ChannelSliderThumb className="vplayer__caption-color-thumb" />
            </ColorPicker.ChannelSlider>
            <ColorPicker.ChannelInput channel="hex" className="vplayer__caption-hex-input" />
          </ColorPicker.Content>
          <ColorPicker.HiddenInput />
        </ColorPicker.Root>
        <RangeSetting
          label={labels.captionTextOpacity}
          value={settings.textOpacity}
          min={0}
          max={1}
          step={0.05}
          display={`${Math.round(settings.textOpacity * 100)}%`}
          onChange={(textOpacity) => remote.setCaptionSettings({ textOpacity })}
        />
        <RangeSetting
          label={labels.captionBackgroundOpacity}
          value={settings.backgroundOpacity}
          min={0}
          max={1}
          step={0.05}
          display={`${Math.round(settings.backgroundOpacity * 100)}%`}
          onChange={(backgroundOpacity) => remote.setCaptionSettings({ backgroundOpacity })}
        />
        <ChoiceSetting
          label={labels.captionEdgeStyle}
          value={settings.edgeStyle}
          choices={[
            { value: 'none', label: labels.captionEdgeNone },
            { value: 'shadow', label: labels.captionEdgeShadow },
            { value: 'outline', label: labels.captionEdgeOutline },
          ]}
          onChange={(edgeStyle) => remote.setCaptionSettings({ edgeStyle })}
        />
      </section>
    </div>
  )
}
