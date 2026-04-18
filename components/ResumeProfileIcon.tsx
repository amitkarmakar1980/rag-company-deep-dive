interface ResumeProfileIconProps {
  containerClassName: string;
  cardClassName: string;
  lineClassName: string;
  photoFrameClassName: string;
  photoBackgroundClassName: string;
  photoHeadClassName: string;
  photoBodyClassName: string;
}

export function ResumeProfileIcon({
  containerClassName,
  cardClassName,
  lineClassName,
  photoFrameClassName,
  photoBackgroundClassName,
  photoHeadClassName,
  photoBodyClassName,
}: ResumeProfileIconProps) {
  return (
    <div className={containerClassName} aria-hidden>
      <div className={cardClassName}>
        <div className={photoFrameClassName}>
          <div className={photoBackgroundClassName} />
          <div className={photoHeadClassName} />
          <div className={photoBodyClassName} />
        </div>
        <div className={`${lineClassName} absolute right-[2px] top-[3px] h-[2px] w-[7px] rounded-full`} />
        <div className={`${lineClassName} absolute right-[2px] top-[7px] h-[2px] w-[7px] rounded-full`} />
        <div className={`${lineClassName} absolute left-[2px] bottom-[3px] h-[2px] w-[11px] rounded-full`} />
      </div>
    </div>
  );
}