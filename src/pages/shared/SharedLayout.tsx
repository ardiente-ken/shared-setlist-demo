import { Outlet, useParams } from 'react-router-dom';
import { useSharedSetlist } from '../../hooks/useSharedSetlist';
import type { SharedSetlist } from '../../models/setlist';
import '../../styles/viewer.css';

export interface SharedContext {
  data: SharedSetlist;
  /** True when showing the last saved copy because the network failed. */
  offline: boolean;
}

/** Loads the setlist behind a share link once and shares it with the list + song pages. */
export default function SharedLayout() {
  const { token } = useParams();
  const { data, loading, error } = useSharedSetlist(token);

  if (!data) {
    return (
      <div className="reader">
        <p className="reader-msg">
          {loading
            ? 'Loading…'
            : error
              ? `Couldn't load this setlist: ${error}`
              : "This link isn't valid, or sharing was turned off. Ask the person who sent it for a new link."}
        </p>
      </div>
    );
  }

  const context: SharedContext = { data, offline: !!error };
  return <Outlet context={context} />;
}
