export default function Avatar({ url, size = 30, alt = '' }) {
  return (
    <div className="avatar" style={{ width: size, height: size, minWidth: size }}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}
