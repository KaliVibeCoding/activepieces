import { cn } from '../lib/utils';

type ShowPoweredByProps = {
  show: boolean;
  position?: 'sticky' | 'absolute' | 'static';
};
const ShowPoweredBy = ({ show, position = 'sticky' }: ShowPoweredByProps) => {
  if (!show) {
    return null;
  }
  return (
    <div
      className={cn('bottom-3 right-5 pointer-events-none ', position, {
        '-mt-[30px]': position === 'sticky',
        'mr-5': position === 'sticky',
      })}
    >
      <div
        className={cn(
          'justify-end p-1 text-muted-foreground/70 text-sm items-center flex gap-1 transition group ',
          {
            'justify-center': position === 'static',
          },
        )}
      >
        <div className=" text-sm transition">Powered by</div>
        <div className="justify-center flex items-center gap-1">
          {/* KVC: Replacing AP logo with KVC text or a KVC SVG icon if available */}
          {/* For now, using text. If an SVG is provided, it can be used like the original AP logo */}
          {/*
          <svg
            width={15}
            height={15}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24" // Replace with KVC SVG viewbox if using SVG
            className="transition fill-primary" // KVC: Use primary color for the icon
          >
            <path d="M_KVC_SVG_PATH_HERE_" /> // KVC: Replace with KVC SVG Path
          </svg>
          */}
          <div className="font-semibold text-primary">KaliVibeCoding</div> {/* KVC: Changed text and applied primary color */}
        </div>
      </div>
    </div>
  );
};

ShowPoweredBy.displayName = 'ShowPoweredBy';
export { ShowPoweredBy };
