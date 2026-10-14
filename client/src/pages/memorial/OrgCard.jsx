import { Link } from 'react-router-dom';
import { MapPin, Clock, Heart, Eye, Navigation } from 'lucide-react';
import { ArchLogo, Stars, KIND, naira, placeLine, compact } from './ui';

export default function OrgCard({ org }) {
  const K = KIND[org.type];
  return (
    <Link
      to={`/memorial/${org._id}`}
      className="group flex flex-col rounded-3xl border border-memorial-200 bg-white p-5 transition hover:border-memorial-400"
    >
      <div className="flex items-start gap-4">
        <ArchLogo org={org} size={64} />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-memorial-100 px-2.5 py-0.5 text-xs font-medium text-memorial-700">
            <K.Icon size={12} /> {K.label}
          </span>
          <h3 className="mt-1.5 truncate font-serif text-xl text-navy-900 group-hover:text-primary-700">{org.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-memorial-500">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{placeLine(org.address) || 'Location not listed'}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Stars value={org.ratingAverage} size={15} />
        <span className="text-sm text-memorial-600">
          {org.ratingCount ? `${org.ratingAverage} (${org.ratingCount})` : 'No reviews yet'}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-memorial-600">
        {org.about || 'Dignified care and clear, honest pricing for families.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-memorial-600">
        {org.is24Hours ? (
          <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Open 24 hours</span>
        ) : org.openingHours ? (
          <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {org.openingHours}</span>
        ) : null}
        {org.distanceKm != null && <span className="inline-flex items-center gap-1.5"><Navigation size={14} /> {org.distanceKm} km away</span>}
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-memorial-100 pt-4">
        <div>
          {org.type === 'cemetery' ? (
            org.availablePlots != null ? (
              <>
                <p className="text-xs text-memorial-500">{org.availablePlots} plots open, from</p>
                <p className="font-serif text-lg text-navy-900">{naira(org.fromPrice || 0)}</p>
              </>
            ) : <p className="text-sm text-memorial-500">Plots not listed yet</p>
          ) : org.memorial?.storageRatePerDay ? (
            <>
              <p className="text-xs text-memorial-500">Storage from</p>
              <p className="font-serif text-lg text-navy-900">{naira(org.memorial.storageRatePerDay)}<span className="font-sans text-xs text-memorial-500"> / day</span></p>
            </>
          ) : <p className="text-sm text-memorial-500">Ask for pricing</p>}
        </div>
        <div className="flex items-center gap-3 text-xs text-memorial-500">
          <span className="inline-flex items-center gap-1"><Heart size={13} className={org.liked ? 'fill-danger text-danger' : ''} /> {compact(org.likesCount || 0)}</span>
          <span className="inline-flex items-center gap-1"><Eye size={13} /> {compact(org.viewsCount || 0)}</span>
        </div>
      </div>
    </Link>
  );
}
