const Loader = ({ label = 'Loading...' }) => (
  <div className="loader">
    <span className="loader__spinner" />
    <p>{label}</p>
  </div>
);

export default Loader;



