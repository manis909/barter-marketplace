// Netflix-style dimmed background behind the login/signup card.
//
// Single flatlay/collage image showing a variety of items, instead of
// a grid of many separate images — one request, far less that can
// break, easy to swap for a different image later (just change the
// BACKGROUND_IMAGE_URL below).
const BACKGROUND_IMAGE_URL = 'https://picsum.photos/seed/barteritems/1600/900';

export default function AuthBackground() {
  return <div className="auth-background" style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }} aria-hidden="true" />;
}