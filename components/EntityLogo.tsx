interface Props {
  initials: string
  color: string
  size?: 'sm' | 'md'
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-[9px]',
  md: 'w-9 h-9 text-[10px]',
}

export default function EntityLogo({ initials, color, size = 'sm' }: Props) {
  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-md flex-shrink-0 flex items-center justify-center font-bold`}
      style={{ background: color + '18', color }}
    >
      {initials}
    </div>
  )
}
