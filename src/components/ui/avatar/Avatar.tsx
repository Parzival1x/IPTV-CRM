interface AvatarProps {
  src?: string; // URL of the avatar image (optional)
  alt?: string; // Alt text for the avatar
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge"; // Avatar size
  status?: "online" | "offline" | "busy" | "none"; // Status indicator
  name?: string; // Name to generate initials from (used when no src)
  initials?: string; // Direct initials to display (overrides name)
}

const sizeClasses = {
  xsmall: "h-6 w-6 max-w-6",
  small: "h-8 w-8 max-w-8",
  medium: "h-10 w-10 max-w-10",
  large: "h-12 w-12 max-w-12",
  xlarge: "h-14 w-14 max-w-14",
  xxlarge: "h-16 w-16 max-w-16",
};

const textSizeClasses = {
  xsmall: "text-xs",
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
  xlarge: "text-xl",
  xxlarge: "text-2xl",
};

const statusSizeClasses = {
  xsmall: "h-1.5 w-1.5 max-w-1.5",
  small: "h-2 w-2 max-w-2",
  medium: "h-2.5 w-2.5 max-w-2.5",
  large: "h-3 w-3 max-w-3",
  xlarge: "h-3.5 w-3.5 max-w-3.5",
  xxlarge: "h-4 w-4 max-w-4",
};

const statusColorClasses = {
  online: "bg-success-500",
  offline: "bg-error-400",
  busy: "bg-warning-500",
};

// Helper functions for avatar initials
const getInitials = (name: string) => {
  const names = name.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500 text-white',
    'bg-green-500 text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
    'bg-indigo-500 text-white',
    'bg-yellow-500 text-white',
    'bg-red-500 text-white',
    'bg-teal-500 text-white'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User Avatar",
  size = "medium",
  status = "none",
  name,
  initials,
}) => {
  const displayInitials = initials || (name ? getInitials(name) : "?");
  const avatarColor = name ? getAvatarColor(name) : 'bg-gray-500 text-white';
  
  return (
    <div className={`relative rounded-full ${sizeClasses[size]}`}>
      {/* Avatar Image or Initials */}
      {src ? (
        <img src={src} alt={alt} className="object-cover rounded-full w-full h-full" />
      ) : (
        <div className={`rounded-full w-full h-full flex items-center justify-center font-bold ${textSizeClasses[size]} ${avatarColor}`}>
          {displayInitials}
        </div>
      )}

      {/* Status Indicator */}
      {status !== "none" && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-gray-900 ${
            statusSizeClasses[size]
          } ${statusColorClasses[status] || ""}`}
        ></span>
      )}
    </div>
  );
};

export default Avatar;
