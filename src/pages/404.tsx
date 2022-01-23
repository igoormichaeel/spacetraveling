import Link from 'next/link';
import Head from 'next/head';

import commonStyles from '../styles/common.module.scss';
import styles from './notFound.module.scss';

export default function Custom404(): JSX.Element {
  return (
    <>
      <Head>
        <title>Página não encontrada | Spacetraveling</title>
      </Head>
      <main className={commonStyles.container}>
        <div className={styles.content}>
          <h1>404 - Página não encontrada</h1>
          <Link href="/">
            <a>Voltar para página inicial</a>
          </Link>
        </div>
      </main>
    </>
  );
}
