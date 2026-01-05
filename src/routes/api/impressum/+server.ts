// Impressum configuration endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { impressumConfig } from '$lib/server/config';

export const GET: RequestHandler = async () => {
return json({
enabled: impressumConfig.enabled,
serviceName: impressumConfig.serviceName,
representativeName: impressumConfig.representativeName,
addressLine1: impressumConfig.addressLine1,
addressLine2: impressumConfig.addressLine2,
city: impressumConfig.city,
postalCode: impressumConfig.postalCode,
country: impressumConfig.country,
email: impressumConfig.email,
phone: impressumConfig.phone
});
};
