import { SetMetadata } from '@nestjs/common';
import { Feature } from '../entitlement.service';

export const FEATURE_REQUISE = 'feature_requise';

/** Marque la route comme soumise à un droit d'abonnement. */
export const RequiresFeature = (feature: Feature) => SetMetadata(FEATURE_REQUISE, feature);
