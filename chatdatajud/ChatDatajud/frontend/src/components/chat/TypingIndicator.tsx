interface Props {
  text: string;
}

export default function TypingIndicator({ text }: Props) {
  return (
    <div className="status">
      <div className="dots">
        <i /><i /><i />
      </div>
      {text}
    </div>
  );
}
