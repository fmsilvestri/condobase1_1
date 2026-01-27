import { getUncachableStripeClient } from '../server/stripe/stripeClient';

async function seedCondominiumFees() {
  console.log('Creating condominium fee products in Stripe...');
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ 
    query: "metadata['type']:'condominium_fee'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist:', existingProducts.data.map(p => p.name));
    return;
  }

  const taxaCondominial = await stripe.products.create({
    name: 'Taxa Condominial Mensal',
    description: 'Taxa mensal de manutenção do condomínio',
    metadata: {
      type: 'condominium_fee',
      category: 'monthly',
    },
  });

  await stripe.prices.create({
    product: taxaCondominial.id,
    unit_amount: 50000,
    currency: 'brl',
  });

  console.log('Created: Taxa Condominial Mensal - R$ 500,00');

  const taxaExtra = await stripe.products.create({
    name: 'Taxa Extra - Obras',
    description: 'Taxa extra para obras e melhorias no condomínio',
    metadata: {
      type: 'condominium_fee',
      category: 'extra',
    },
  });

  await stripe.prices.create({
    product: taxaExtra.id,
    unit_amount: 20000,
    currency: 'brl',
  });

  console.log('Created: Taxa Extra - Obras - R$ 200,00');

  const reservaFundo = await stripe.products.create({
    name: 'Fundo de Reserva',
    description: 'Contribuição para o fundo de reserva do condomínio',
    metadata: {
      type: 'condominium_fee',
      category: 'reserve',
    },
  });

  await stripe.prices.create({
    product: reservaFundo.id,
    unit_amount: 10000,
    currency: 'brl',
  });

  console.log('Created: Fundo de Reserva - R$ 100,00');

  const multaAtraso = await stripe.products.create({
    name: 'Multa por Atraso',
    description: 'Multa por pagamento em atraso',
    metadata: {
      type: 'condominium_fee',
      category: 'penalty',
    },
  });

  await stripe.prices.create({
    product: multaAtraso.id,
    unit_amount: 5000,
    currency: 'brl',
  });

  console.log('Created: Multa por Atraso - R$ 50,00');

  console.log('\nAll products created successfully!');
  console.log('Stripe webhooks will sync them to the database automatically.');
}

seedCondominiumFees().catch(console.error);
