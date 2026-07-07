import logoAsset from '../../assets/unicar-logo-new.png';

export default function Logo({ className = '', alt = 'UniCar' }) {
  return <img src={logoAsset} alt={alt} className={className} />;
}
