import { StarField } from './StarField';
import { Sun } from './Sun';

export function SpaceScene({
  starCount = 180,
}: {
  starCount?: number;
}) {
  return (
    <>
      <StarField count={starCount} />
      <div className="nebula" aria-hidden="true" />
      <Sun />
    </>
  );
}

