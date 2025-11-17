const Avatar = ({ name = '', color = '#60a5fa', size = 32 }) => (
  <div
    className="avatar"
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      lineHeight: `${size}px`,
    }}
  >
    {name.slice(0, 1).toUpperCase()}
  </div>
);

export default Avatar;



