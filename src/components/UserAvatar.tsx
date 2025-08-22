import { UserDto } from '../api/types';

export default function UserAvatar({
  user,
  size = 28,
}: {
  user: Pick<UserDto, 'fullName' | 'email'> | { fullName?: string; email?: string };
  size?: number;
}) {
  const initials = (user.fullName || user.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="inline-flex items-center justify-center rounded-full bg-primary-600 text-white text-xs font-medium"
      style={{ width: size, height: size }}
      title={user.fullName || user.email}
    >
      {initials}
    </div>
  );
}
