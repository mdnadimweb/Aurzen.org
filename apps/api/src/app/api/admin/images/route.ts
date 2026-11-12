import {requireAdmin} from '../../../../lib/auth';
import {assert,failure,json,sameOrigin} from '../../../../lib/http';
import {saveImage,uploadForm} from '../../../../lib/images';
export const runtime='nodejs';
export async function POST(request:Request){try{
  sameOrigin(request);await requireAdmin();
  const form=await uploadForm(request),file=form.get('photo');
  assert(file instanceof File,'Choose a photo to upload.');
  return json(await saveImage(file),201);
}catch(error){return failure(error);}}
