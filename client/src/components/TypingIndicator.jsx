const TypingIndicator = ({ typingUsers }) => {
  const names = Object.values(typingUsers || {}).filter(Boolean);
  if (names.length === 0) return null;

  const message =
    names.length === 1 ? `${names[0]} is typing...` : `${names.slice(0, 3).join(', ')} are typing...`;

  return <div className="typing-indicator">{message}</div>;
};

export default TypingIndicator;



