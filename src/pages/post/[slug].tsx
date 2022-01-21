/* eslint-disable react/no-danger */
import Head from 'next/head';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';
import { format } from 'date-fns';
import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const numberOfWords = post.data.content
    .map(subsection => {
      const numberOfWordsOfHeading = subsection.heading.split(' ').length;

      const numberOfWordsOfBody = subsection.body
        .map(
          contentBody =>
            contentBody.text.replace(/\n+|\n/g, ' ').split(' ').length
        )
        .reduce((acc, current) => acc + current);

      return numberOfWordsOfHeading + numberOfWordsOfBody;
    })
    .reduce((acc, current) => acc + current);

  const readingTime = Math.ceil(numberOfWords / 200);

  return (
    <>
      <Head>
        <title> {post.data.title} | Spacetraveling</title>
      </Head>
      <main>
        <img
          src={post.data.banner.url}
          alt="banner"
          className={styles.banner}
        />
        <div className={commonStyles.container}>
          <article className={styles.content}>
            <h1>{post.data.title}</h1>

            <div className={styles.postsInfo}>
              <FiCalendar />
              <time>{formattedDate}</time>
              <FiUser />
              <span>{post.data.author}</span>
              <FiClock />
              <span>{readingTime} min</span>
            </div>

            {post.data.content.map(content => {
              return (
                <div key={content.heading}>
                  <h2>{content.heading}</h2>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: RichText.asHtml(content.body),
                    }}
                  />
                </div>
              );
            })}
          </article>
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: { post },
    revalidate: 60 * 30, // 30 minutes
  };
};
